let canvas = Pebble.createCanvas();

let stage = Pebble.createStage(canvas.width, canvas.height);

let assets = new Pebble.AssetLoader();
assets.load(['fonts/Lobster-Regular.ttf']);

let circle = Pebble.Circle(50, "red", "none");
circle.pivotX = 0.5;
circle.x = canvas.width / 2 - circle.halfWidth;
circle.y = canvas.height / 2 - circle.halfHeight;
stage.addChild(circle);

let rect = Pebble.Rectangle(30, 30, "red", "none");
circle.addChild(rect);

let line1 = Pebble.Line("black", 4, 32, 32, 64, 64);
let line2 = Pebble.Line("red", 4, 64, 64, 32, 64);
let line3 = Pebble.Line("green", 4, 32, 64, 32, 32);
stage.add(line1, line2, line3);

let text = Pebble.Text("Hello", "32px Lobster-Regular");
stage.addChild(text);

function Animate() {
    circle.rotation += 0.05
    Pebble.render(canvas);
    requestAnimationFrame(Animate);
}

Animate();