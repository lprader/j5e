/**
 * Switch module - For controlling switches
 * @module j5e/switch
 * @requires module:@j5e/event
 * @requires module:@j5e/fn
 */

import { Emitter } from "@j5e/event";
import {normalizeParams, getProvider} from "@j5e/fn";

/** 
 * Class representing a switch
 * @classdesc The Switch class allows for control of digital switches
 * @async
 * @extends Emitter
 * @fires Switch#open
 * @fires Switch#close
 */
class Switch extends Emitter {
  
  /**
   * Instantiate a switch
   * @param {(number|string|object)} io - A pin number, pin identifier or a complete IO options object
   * @param {(number|string)} [io.pin] - If passing an object, a pin number or pin identifier
   * @param {(string|constructor)} [io.io=builtin/digital] - If passing an object, a string specifying a path to the IO provider or a constructor
   * @param {object} [device={}] - An object containing device options
   * @property {boolean} isClosed - True if the switch is closed (current is flowing)
   * @property {boolean} isOpen - True if the switch is open (current is not flowing)
   */
  constructor(io, device) { 
    return (async () => {
      const {ioOpts, deviceOpts} = normalizeParams(io, device);
      super();

      const Provider = await getProvider(ioOpts, "builtin/digital");
      this.io = new Provider({
        pin: ioOpts.pin,
        mode: Provider.Input,
        edge: Provider.Rising | Provider.Falling,
        onReadable: () => { this.emit(this.isOpen ? "open" : "close") }
      });

      Object.defineProperties(this, {
        isClosed: {
          get: () => {
            return !this.io.read();
          }
        },
        isOpen: {
          get: () => {
            return this.io.read();
          }
        }
      });
      
      return this;
    })();
    
    
  }

}

export default Switch;