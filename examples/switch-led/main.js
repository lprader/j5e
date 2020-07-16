import Switch from "j5e/switch";
import LED from "j5e/led";

const mySwitch = await new Switch(14);
const led = await new LED(12);

mySwitch.on("open", function() {
  console.log("off");
  led.off();
});

mySwitch.on("close", function() {
  console.log("on");
  led.on();
});