import Button from "j5e/button";
import LED from "j5e/led";

const button = await new Button(14);
const led = await new LED(12);

button.on("open", function() {
  console.log("off");
  led.stop().off();
});

button.on("close", function() {
  console.log("on");
  led.on();
});

button.on("hold", function() {
  console.log("hold");
  led.blink();
})