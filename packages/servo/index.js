/**
 * Servo module - For controlling hobby servos
 * @module j5e/servo
 * @requires module:@j5e/animation
 * @requires module:@j5e/easing
 * @requires module:@j5e/event
 * @requires module:@j5e/fn
 */

import Animation from "@j5e/animation";
import { Emitter } from "@j5e/event";
import {constrain, normalizeParams, getProvider, map, timer} from "@j5e/fn";
import { inOutSine } from "@j5e/easing"; 

/** 
 * Class representing a Servo
 * @classdesc The Servo class allows for control of hobby servos
 * @async
 * @extends Emitter
 * @fires Servo#move:complete - Fires when a servo reaches its requested position
 */
class Servo extends Emitter {
  
  #state = {
    history: [],
    isRunning: false,
    animation: null,
    value: null
  };

  /**
   * Instantiate a Servo
   * @param {(number|string|object)} io - A pin number, pin identifier or a complete IO options object
   * @param {(number|string)} [io.pin] - If passing an object, a pin number or pin identifier
   * @param {(string|constructor)} [io.io=builtin/digital] - If passing an object, a string specifying a path to the IO provider or a constructor
   * @param {object} [device={}] - An object containing device options
   * @param {string} [device.type="standard"] - Type of servo ("standard" or "continuous")
   * @param {number[]} [device.pwmRange=[600, 2400]] - The pulse width range in microseconds
   * @param {number[]} [device.deadband=[1500,1500]] - The range at which a continuos motion servo will not turn
   * @param {number[]} [device.range=[0, 180]] - The allowed range of motion in degrees
   * @param {number[]} [device.deviceRange=[0, 180]] - The physical range of the servo in degrees
   * @param {number} [device.startAt="Any value within device.range"] - The desired start position of the servo
   * @param {number} [device.offset=0] - Adjust the position of the servo for trimming
   * @param {boolean} [device.invert=false] - Reverses the direction of rotation
   * @param {boolean} [device.center=false] - Center the servo on instantiation
   * @property {object[]} history - The last five position updates
   * @property {object[]} history.timestamp - Timestamp of position update
   * @property {object[]} history.target - The user requested position
   * @property {object[]} history.degrees - The actual position (factors in offset and invert)
   * @property {object} last - The most recent position update
   * @property {object[]} last.timestamp - Timestamp of position update
   * @property {object[]} last.target - The user requested position
   * @property {object[]} last.degrees - The corrected position (factors in offset and invert)
   * @property {number} position - The most recent request and corrected position (factors in offset and invert)
   */
  constructor(io, device) {
    return (async () => {
      const {ioOpts, deviceOpts} = normalizeParams(io, device);

      const Provider = await getProvider(ioOpts, "builtin/pwm");
      super();
      
      this.io = new Provider({
        pin: ioOpts.pin,
        mode: Provider.Output,
        hz: 50
      });

      this.#state.pwmRange = deviceOpts.pwmRange || [600, 2400];
      this.#state.pwmRange = [34, 120]; // This line is a hack until we can write in µs
      this.#state.degreeRange = deviceOpts.degreeRange || [0, 180];
      this.#state.deadband = deviceOpts.deadband || [1500, 1500];
      this.#state.deadband = deviceOpts.deadband || [77, 77]; // This line is a hack until we can write in µs
      this.#state.offset = deviceOpts.offset || 0;
      this.#state.startAt = deviceOpts.startAt || (this.#state.degreeRange[1] - this.#state.degreeRange[0]) / 2;
      this.#state.range = deviceOpts.range || [0 - this.offset, 180 - this.offset];
      this.#state.type = deviceOpts.type || "standard";
      this.#state.invert = deviceOpts.invert || false;
      this.#state.isRunning = false;

      Object.defineProperties(this, {
        history: {
          get: function() {
            return this.#state.history.slice(-5);
          }
        },
        last: {
          get: function() {
            if (this.#state.history.length) {
              return this.#state.history[this.#state.history.length - 1];
            } else {
              return {
                timestamp: Date.now(),
                degrees: this.#state.startAt,
                target: this.#state.startAt
              }
            }
          }
        },
        position: {
          get: function() {
            return this.#state.history.length ? this.#state.history[this.#state.history.length - 1].degrees : -1;
          }
        }
      });

      this.initialize(deviceOpts);

      // If "startAt" is defined and center is falsy
      // set servo to min or max degrees
      if (typeof deviceOpts.startAt !== "undefined") {
        this.to(deviceOpts.startAt);
      } else {

        if (deviceOpts.center) {
          this.center();
        }

        if (deviceOpts.type === "continuous") {
          this.stop();
        }
      
      }

      return this;
    })();
  }

  /**
   * The initialization code for a servo
   */
  initialize(deviceOpts) {
    // No operation here... Meant to be overwritten by descendants
  }

  /**
   * Calls the write param on the IO instance for this servo.
   * @param {number} degrees - The absolute position to move a servo to
   * @returns {Servo}
   */
  update(degrees) {
    
    // If same degrees return immediately.
    if (this.last && this.last.degrees === degrees) {
      return this;
    }

    // Map value from degreeRange to pwmRange
    let microseconds = map(
      degrees,
      this.#state.degreeRange[0], this.#state.degreeRange[1],
      this.#state.pwmRange[0], this.#state.pwmRange[1]
    );

    // Restrict values to integers
    microseconds |= 0;

    this.io.write(microseconds);
  }

  /**
  * to
  *
  * Set the servo horn's position to given degree over time.
  *
  * @param {Number} degrees   Degrees to turn servo to.
  * @param {Number} [time=1000]      Time to spend in motion.
  * @param {Number} [rate=20]      The rate of the motion transiton
  *
  * - or -
  *
  * @param {Object} an Animation() segment config object
  *
  * @return {Servo} instance
  */
  to(degrees, time, rate) {

    let options = {
      duration: 1000,
      cuePoints: [0, 1.0],
      keyFrames: [
        null,
        {
          value: typeof degrees.degrees === "number" ? degrees.degrees : this.startAt
        }
      ],
      oncomplete: () => {
        // Enforce async execution for user "oncomplete"
        timer.setImmediate(() => {
          if (typeof degrees.oncomplete === "function") {
            degrees.oncomplete();
          }
          this.emit("move:complete");
        });
      }
    };

    if (typeof degrees === "object") {

      Object.assign(options, degrees);
      
      this.#state.isRunning = true;
      this.#state.animation =  this.#state.animation || new Animation(this);
      this.#state.animation.enqueue(options);

    } else {

      const target = degrees;

      // Enforce limited range of motion
      degrees = constrain(degrees, this.#state.range[0], this.#state.range[1]);

      if (typeof time !== "undefined") {

        options.duration = time;
        options.keyFrames = [null, {
          degrees: degrees
        }];
        options.fps = rate || 20;

        this.to(options);

      } else {

        this.#state.value = degrees;

        degrees += this.#state.offset;

        if (this.#state.invert) {
          degrees = map(
            degrees,
            this.#state.degreeRange[0], this.#state.degreeRange[1],
            this.#state.degreeRange[1], this.#state.degreeRange[0]
          );
        }

        this.update(degrees);

        if (this.#state.history.length > 5) {
          this.#state.history.shift();
        }

        this.#state.history.push({
          timestamp: Date.now(),
          degrees: degrees,
          target: target
        });
      }
    }

    return this;
  }

  /**
   * @param [number || object] keyFrames An array of step values or a keyFrame objects
   */
  normalize(keyFrames) {
    
    let last = this.last ? this.last.target : this.startAt;

    // If user passes null as the first element in keyFrames use current position
    if (keyFrames[0] === null) {
      keyFrames[0] = {
        value: last
      };
    }

    // If user passes a step as the first element in keyFrames use current position + step
    if (typeof keyFrames[0] === "number") {
      keyFrames[0] = {
        value: last + keyFrames[0]
      };
    }

    return keyFrames.map(function(frame) {
      let value = frame;

      /* istanbul ignore else */
      if (frame !== null) {
        // frames that are just numbers represent _step_
        if (typeof frame === "number") {
          frame = {
            step: value,
          };
        } else {
          if (typeof frame.degrees === "number") {
            frame.value = frame.degrees;
            delete frame.degrees;
          }
          if (typeof frame.copyDegrees === "number") {
            frame.copyValue = frame.copyDegrees;
            delete frame.copyDegrees;
          }
        }

      }
      return frame;
    });
  }

  /**
   * render
   *
   * @position [number] value to set the servo to
   */
  render(position) {
    return this.to(position[0]);
  }

  /**
   * step
   *
   * Update the servo horn's position by specified degrees (over time)
   *
   * @param  {Number} degrees   Degrees to turn servo to.
   * @param  {Number} [time]      Time to spend in motion.
   *
   * @return {Servo} instance
   */
  step(degrees, time) {
    return this.to(this.last.target + degrees, time);
  }

  /**
   * min Set Servo to minimum degrees, defaults to 0deg
   * @param  {Number} [time]      Time to spend in motion.
   * @return {Object} instance
   */
  min(time) {
    return this.to(this.#state.degreeRange[0], time);
  };

  /**
   * max Set Servo to maximum degrees, defaults to 180deg
   * @param  {Number} [time]      Time to spend in motion.
   * @return {Object} instance
   */
  max(time) {
    return this.to(this.#state.degreeRange[1], time);
  }

  /**
   * center Set Servo to centerpoint, defaults to 90deg
   * @param  {Number} time      Time to spend in motion.
   * @return {Object} instance
   */
  center(time) {
    return this.to(Math.abs((this.#state.degreeRange[0] + this.#state.degreeRange[1]) / 2), time);
  }

  /**
   * home Return Servo to startAt position
   */
  home() {
    return this.to(this.#state.startAt);
  }

  /**
   * sweep Sweep the servo between min and max or provided range
   * @param  {Array} range constrain sweep to range
   *
   * @param {Object} options Set range or interval.
   *
   */
  sweep(opts) {

    var options = {
      keyFrames: [{
        value: this.#state.degreeRange[0]
      }, {
        value: this.#state.degreeRange[1]
      }],
      metronomic: true,
      loop: true,
      easing: inOutSine
    };
    
    // If opts is an array, then assume a range was passed
    if (Array.isArray(opts)) {
      options.keyFrames = rangeToKeyFrames(opts);
    } else {
      if (typeof opts === "object" && opts !== null) {
        Object.assign(options, opts);
        if (Array.isArray(options.range)) {
          options.keyFrames = rangeToKeyFrames(options.range);
        }
      }
    }

    return this.to(options);
  }

  /**
   * stop Stop a moving servo
   */
  stop() {
    
    if (this.#state.animation) {
      this.#state.animation.stop();
    }

    if (this.#state.type === "continuous") {
      this.to(
        this.#state.deadband.reduce(function(a, b) {
          return Math.round((a + b) / 2);
        })
      );
    }

    return this;
  }

  /**
   * cw Move a continuous rotation servo clockwise
   * @param  {number} speed Speed between 0 and 1.
   */
  cw(speed=1) {
    speed = constrain(speed, 0, 1);
    speed = map(speed, 0, 1, this.#state.deadband[1] + 1, this.#state.pwmRange[1]);
    return this.to(speed);
  }

  /**
   * csw Move a continuous rotation servo counter-clockwise
   * @param  {number} speed Speed between 0 and 1.
   */
  ccw(speed=1) {
    speed = constrain(speed, 0, 1);
    speed = map(speed, 0, 1, this.#state.deadband[0] - 1, this.#state.pwmRange[0]);
    return this.to(speed);
  }

}

function rangeToKeyFrames(range) {
  return range.map(function(value) {
    return { value: value };
  });
}

export default Servo;