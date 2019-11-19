/**
 * Led module - For controlling LED's
 * @module j5e/led
 */

import {normalizeParams, constrain, getProvider, timer} from "../util/fn.js";
import {inOutSine, outSine} from "../util/easing.js";
import Animation from "../util/animation.js";

/** 
 * Class representing an LED
 * @classdesc The Led class allows for control of LED's
 */
class Led {
  
  #state = {
    sink: false, 
    isRunning: false,
    value: 0,
    direction: 1,
    mode: null,
    interval: null
  };

  /**
   * Instantiate an LED
   * @param {(number|string|object)} io - A pin number, pin identifier or a complete IO options object
   * @param {(number|string)} [io.pin] - If passing an object, a pin number or pin identifier
   * @param {(string|constructor)} [io.io=builtin/digital] - If passing an object, a string specifying a path to the IO provider or a constructor
   * @param {object} [device={}] - An object containing device options
   * @param {boolean} [device.sink=false] - True if the device is wired for sink drive
   */
  constructor(io, device) {
    return (async () => {
      const {ioOpts, deviceOpts} = normalizeParams(io, device);

      const Provider = await getProvider(ioOpts, "builtin/digital");
      
      this.io = new Provider({
        pin: ioOpts.pin,
        mode: Provider.Output
      });
      
      this.LOW = 0;

      Object.defineProperties(this, {
        value: {
          get: function() {
            return this.#state.value;
          }
        },
        mode: {
          get: function() {
            return this.#state.mode;
          }
        },
        isOn: {
          get: function() {
            return !!this.#state.value;
          }
        },
        isRunning: {
          get: function() {
            return this.#state.isRunning;
          }
        }
      });

      if (deviceOpts.sink) {
        this.#state.sink = true;
      }
      
      if (this.io.resolution) {
        this.HIGH = (1 << this.io.resolution) -1;
      } else {
        this.HIGH = 1;
      }
      
      return this;
    })();
  }

   /**
   * Internal method that writes the current LED value to the IO
   */
  write() {
    let value = constrain(this.#state.value, this.LOW, this.HIGH);

    if (this.#state.sink) {
      value = this.HIGH - value;
    }

    this.io.write(value | 0);
  }

  /**
   * Turn an led on
   * @return {Led}
   */
  on() {
    this.#state.value = this.HIGH;
    this.write();
    return this;
  }

  /**
   * Turn an led off
   * @return {Led}
   */
  off() {
    this.#state.value = this.LOW;
    this.write();
    return this;
  }

  /**
   * Toggle the on/off state of an led
   * @return {Led}
   */
  toggle() {
    return this[this.isOn ? "off" : "on"]();
  }

  /**
   * Blink the LED on a fixed interval
   * @param {Number} duration=100 - Time in ms on, time in ms off
   * @param {Function} callback - Method to call on blink
   * @return {Led}
   */
  blink(duration=100, callback) {
    // Avoid traffic jams
    this.stop();

    if (typeof duration === "function") {
      callback = duration;
      duration = 100;
    }

    this.#state.isRunning = true;

    this.#state.interval = timer.setInterval(() => {
        this.toggle();
      if (typeof callback === "function") {
        callback();
      }
    }, duration);

    return this;
  }

  /**
   * Set the brightness of an led attached to PWM
   * @param {Integer} value - Brightness value [this.HIGH, this.LOW]
   * @return {Led}
   */
  brightness(value) {
    this.#state.value = value;
    this.io.write(value);
    return this;
  }

  /**
   * Set the brightness of an led 0-100
   * @param {Integer} value - Brightness value [0, 100]
   * @return {Led}
   */
  intensity(value) {
    this.#state.value = map(value, 0, 100, this.LOW, this.HIGH);
    this.io.write(value);
    return this;
  }

  /**
   * Pulse the Led in and out in a loop with specified time
   * @param {number} [time=1000] Time in ms that a fade in/out will elapse
   * @param {function} [callback] A function to run each time the direction of pulse changes
   * @return {Led}
   */

  pulse(time=1000, callback) {
    
    this.stop();

    var options = {
      duration: typeof time === "number" ? time : 1000,
      keyFrames: [this.LOW, this.HIGH],
      metronomic: true,
      loop: true,
      easing: inOutSine,
      onloop: function() {
        /* istanbul ignore else */
        if (typeof callback === "function") {
          callback();
        }
      }
    };

    if (typeof time === "object") {
      Object.assign(options, time);
    }

    if (typeof time === "function") {
      callback = time;
    }

    this.#state.isRunning = true;

    this.#state.animation = this.#state.animation || new Animation(this);
    this.#state.animation.enqueue(options);
    return this;
    
  }  

  /**
   * fade Fade an led in and out
   * @param {Number} val Target brightness value
   * @param {Number} [time=1000] Time in ms that a fade will take
   * @param {function} [callback] A function to run when the fade is complete
   * @return {Led}
   */
  fade(val, time=1000, callback) {
    
    this.stop();

    var options = {
      duration: typeof time === "number" ? time : 1000,
      keyFrames: [null, typeof val === "number" ? val : 0xff],
      easing: outSine,
      oncomplete: function() {
        this.stop();
        if (typeof callback === "function") {
          callback();
        }
      }
    };

    if (typeof val === "object") {
      Object.assign(options, val);
    }

    if (typeof val === "function") {
      callback = val;
    }

    if (typeof time === "object") {
      Object.assign(options, time);
    }

    if (typeof time === "function") {
      callback = time;
    }

    this.#state.isRunning = true;

    this.#state.animation = this.#state.animation || new Animation(this);
    this.#state.animation.enqueue(options);

    return this;
  }

  /**
   * fade Fade an led in
   * @param {Number} [time=1000] Time in ms that a fade will take
   * @param {function} [callback] A function to run when the fade is complete
   * @return {Led}
   */
  fadeIn(time=1000, callback) {
    return this.fade(this.HIGH, time, callback);
  }

  /**
   * fade Fade an led out
   * @param {Number} [time=1000] Time in ms that a fade will take
   * @param {function} [callback] A function to run when the fade is complete
   * @return {Led}
   */
  fadeOut(time=1000, callback) {
    return this.fade(this.LOW, time, callback);
  }

  /**
   * stop Stop the led from strobing, pulsing or fading
   * @return {Led}
   */
  stop() {
    
    if (this.#state.interval) {
      timer.clearInterval(this.#state.interval);
    }

    this.#state.interval = null;
    this.#state.isRunning = false;

    return this;
  };

  /**
   * @param [number || object] keyFrames An array of step values or a keyFrame objects
   */

  normalize(keyFrames) {
    
    // If user passes null as the first element in keyFrames use current value
    /* istanbul ignore else */
    if (keyFrames[0] === null) {
      keyFrames[0] = {
        value: this.#state.value || 0
      };
    }

    return keyFrames.map(function(frame) {
      let value = frame;
      /* istanbul ignore else */
      if (frame !== null) {
        // frames that are just numbers represent values
        if (typeof frame === "number") {
          frame = {
            value: value,
          };
        } else {
          if (typeof frame.brightness === "number") {
            frame.value = frame.brightness;
            delete frame.brightness;
          }
          if (typeof frame.intensity === "number") {
            frame.value = Fn.scale(frame.intensity, 0, 100, 0, 255);
            delete frame.intensity;
          }
        }

      }
      return frame;
    });
  }

  /**
   * @position [number] value to set the led to
   */
  render(position) {
    this.#state.value = position[0];
    return this.write();
  };

};

export default Led;