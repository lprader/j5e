import assert from "assert";
import sinon from "sinon";
import { Digital, PWM } from "@dtex/mock-io";
import LED from "j5e/led";

describe("LED - Digital", function() {

  describe("Instantiation", function() {

    it("should return a valid LED instance when passed an options object", async function() {

      const led = await new LED({
        pin: 12,
        io: Digital
      });

      assert.equal(led instanceof LED, true);
      assert.equal(led.LOW, 0);
      assert.equal(led.HIGH, 1);

    });

  });

  describe("Properties", function() {

    describe("value", function() {

      it("should return the current value", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        led.on(1);
        assert.equal(led.value, 1);

      });
    });

    describe("isOn", function() {

      it("should return true if the LED is on", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        led.on();
        assert.equal(led.isOn, true);

        led.off();
        assert.equal(led.isOn, false);

      });
    });

    describe("isRunning", function() {

      it("should return true if the LED is blinking", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        assert.equal(led.isRunning, false);

        led.blink();
        assert.equal(led.isRunning, true);

        led.stop();
        assert.equal(led.isRunning, false);

      });

      it("should return true if the LED is pulsing", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        assert.equal(led.isRunning, false);

        led.pulse();
        assert.equal(led.isRunning, true);

        led.stop();
        assert.equal(led.isRunning, false);

      });

    });

  });

  describe("Methods", function() {

    describe("On", function() {

      it("should call io digital.write with 1", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        const writeSpy = sinon.spy(led.io, "write");

        assert.equal(led.value, 0);
        led.on();
        assert.equal(writeSpy.getCall(0).args[0], 1);
        assert.equal(led.value, 1);
      });

    });

    describe("Off", function() {

      it("should call io digital.write with 0", async function() {

        const led = await new LED({
          pin: 12,
          io: Digital
        });

        const writeSpy = sinon.spy(led.io, "write");

        led.on();
        assert.equal(led.value, 1);
        led.off();
        assert.equal(writeSpy.getCall(0).args[0], 1);
        assert.equal(writeSpy.getCall(1).args[0], 0);
        assert.equal(led.value, 0);
      });

    });

    describe("Toggle", function() {

      it("should call io digital.write twice, with 1 and 0", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });
        const writeSpy = sinon.spy(led.io, "write");

        assert.equal(led.value, 0);

        led.toggle();
        assert(writeSpy.calledOnceWith(1));
        assert.equal(led.value, 1);

        led.toggle();
        assert.equal(writeSpy.callCount, 2);
        assert.equal(writeSpy.secondCall.args[0], 0);
        assert.equal(led.value, 0);

      });

    });

    describe("Blink", function() {

      it("should change state 10 times in 1050 millisconeds", async function() {

        const clock = sinon.useFakeTimers();
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        const writeSpy = sinon.spy(led.io, "write");

        led.blink();
        clock.tick(1050);

        assert.equal(led.value, 0);
        assert.equal(writeSpy.callCount, 10);

        clock.restore();
      });

    });

    describe("Stop", function() {

      it("should change state only 5 times in 2050 millisconeds", async function() {

        const clock = sinon.useFakeTimers();
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        sinon.spy(led.io, "write");

        led.blink();
        setTimeout(function() {
          led.stop();
        }, 550);
        clock.tick(2050);

        assert.equal(led.value, 1);
        assert.equal(led.io.write.callCount, 5);

        clock.restore();
      });

    });

  });

});

describe("LED - PWM", function() {

  describe("Instantiation", function() {

    it("should return a valid LED instance when passed an options object", async function() {

      const led = await new LED({
        pin: 12,
        io: PWM
      });

      assert.equal(led instanceof LED, true);
      assert.equal(led.LOW, 0);
      assert.equal(led.HIGH, 1023);

    });

  });

  describe("Properties", function() {

    describe("value", function() {

      it("should return the current value", async function() {
        const led = await new LED({
          pin: 12,
          io: PWM
        });

        led.on();
        assert.equal(led.value, 1023);

        led.brightness(512);
        assert.equal(led.value, 512);


      });
    });

    describe("isOn", function() {

      it("should return true if the LED is on", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        led.on();
        assert.equal(led.isOn, true);

        led.off();
        assert.equal(led.isOn, false);

      });
    });

    describe("isRunning", function() {

      it("should return true if the LED is blinking", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        assert.equal(led.isRunning, false);

        led.blink();
        assert.equal(led.isRunning, true);

        led.stop();
        assert.equal(led.isRunning, false);

      });

      it("should return true if the LED is pulsing", async function() {
        const led = await new LED({
          pin: 12,
          io: Digital
        });

        assert.equal(led.isRunning, false);

        led.pulse();
        assert.equal(led.isRunning, true);

        led.stop();
        assert.equal(led.isRunning, false);

      });

    });

  });

  describe("Methods", function() {
    describe("On", function() {

      it("should call io digital.write with 1", async function() {
        const led = await new LED({
          pin: 12,
          io: PWM
        });
        const writeSpy = sinon.spy(led.io, "write");

        assert.equal(led.value, 0);
        led.on();
        assert.equal(writeSpy.getCall(0).args[0], 1023);
        assert.equal(led.value, 1023);
      });

    });

    describe("Off", function() {

      it("should call io digital.write with 0", async function() {

        const led = await new LED({
          pin: 12,
          io: PWM
        });

        const writeSpy = sinon.spy(led.io, "write");

        led.on();
        assert.equal(led.value, 1023);
        led.off();
        assert.equal(writeSpy.getCall(0).args[0], 1023);
        assert.equal(writeSpy.getCall(1).args[0], 0);
        assert.equal(led.value, 0);
      });

    });

    describe("Toggle", function() {

      it("should call io digital.write twice, with 1 and 0", async function() {

        const led = await new LED({
          pin: 12,
          io: PWM
        });
        const writeSpy = sinon.spy(led.io, "write");

        assert.equal(led.value, 0);

        led.toggle();
        assert(writeSpy.calledOnceWith(1023));
        assert.equal(led.value, 1023);

        led.toggle();
        assert.equal(writeSpy.callCount, 2);
        assert.equal(writeSpy.secondCall.args[0], 0);
        assert.equal(led.value, 0);

      });
    });

    describe("Brightness", function() {

      it("should call io digital.write twice, with 0 and 512", async function() {

        const led = await new LED({
          pin: 12,
          io: PWM
        });
        const writeSpy = sinon.spy(led.io, "write");

        assert.equal(led.value, 0);

        led.off();
        assert(writeSpy.calledOnceWith(0));
        assert.equal(led.value, 0);

        led.brightness(512);
        assert.equal(writeSpy.callCount, 2);
        assert.equal(writeSpy.secondCall.args[0], 512);
        assert.equal(led.value, 512);

      });
    });

    describe("Fade In and Fade Out", function() {

      it("should call fade and...", async function() {

        const clock = sinon.useFakeTimers();
        const led = await new LED({
          pin: 12,
          io: PWM
        });
        const writeSpy = sinon.spy(led.io, "write");

        led.off();
        assert.equal(led.value, 0);
        assert(writeSpy.calledOnceWith(0));

        led.fadeIn();
        clock.tick(1050);
        assert.equal(writeSpy.callCount, 51);
        assert.equal(writeSpy.getCall(0).args[0], 0);
        assert.equal(writeSpy.getCall(26).args[0], 745);
        assert.equal(writeSpy.getCall(50).args[0], 1023);

        led.fadeOut();
        clock.tick(1050);
        assert.equal(writeSpy.callCount, 101);
        assert.equal(writeSpy.getCall(51).args[0], 990);
        assert.equal(writeSpy.getCall(76).args[0], 277);
        assert.equal(writeSpy.getCall(100).args[0], 0);

        clock.restore();
      });
    });
  });

});
