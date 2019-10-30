class Pebble {
    static createCanvas(
        domElement = document.body,
        width = 400,
        height = 400,
        border = "1px dashed black",
        background = "white"
    ) {
        let canvas = document.createElement('canvas');
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);
        domElement.appendChild(canvas);

        let dpr = window.devicePixelRatio || 1;
        let rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        canvas.ctx = canvas.getContext('2d');
        canvas.ctx.scale(dpr, dpr);

        canvas.setAttribute("style", `width: ${canvas.width/dpr}px; height: ${canvas.height/dpr}px; border: ${border}; background: ${background};`);

        return canvas;
    }

    static createStage(width = 0, height = 0) {
        return new DisplayObject(width, height);
    }
    static render(canvas) {
        let ctx = canvas.ctx;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stage.children.forEach(sprite => {
            displaySprite(sprite);
        });

        function displaySprite(sprite) {
            if (sprite.visible &&
                sprite.gx < canvas.width + sprite.width &&
                sprite.gx + sprite.width >= -sprite.width &&
                sprite.gy < canvas.height + sprite.height &&
                sprite.gy + sprite.height >= -sprite.height
            ) {
                ctx.save();

                ctx.translate(
                    sprite.x + (sprite.width * sprite.pivotX),
                    sprite.y + (sprite.height * sprite.pivotY)
                );

                ctx.rotate(sprite.rotation);
                ctx.globalAlpha = sprite.alpha * sprite.parent.alpha;
                ctx.scale(sprite.scaleX, sprite.scaleY);

                if (sprite.shadow) {
                    cx.shadowColor = sprite.shadowColor;
                    ctx.shadowOffsetX = sprite.shadowOffsetX;
                    ctx.shadowOffsetY = sprite.shadowOffsetY;
                    ctx.shadowBlur = sprite.shadowBlur;
                }

                if (sprite.blendMode) ctx.globalCompositeOperation = sprite.blendMode;

                if (sprite.render) sprite.render(ctx);

                if (sprite.children && sprite.children.length > 0) {
                    ctx.translate(-sprite.width * sprite.pivotX, -sprite.height * sprite.pivotY);

                    sprite.children.forEach(child => {
                        displaySprite(child);
                    });
                }
                ctx.restore();
            }
        }
    }
    static Rectangle(width = 32, height = 32, fillStyle = "gray", strokeStyle = "none", lineWidth = 0, x = 0, y = 0) {
        return new RectangleCanvasObject(width, height, fillStyle, strokeStyle, lineWidth, x, y);
    }
    static Circle(diameter = 32, fillStyle = "gray", strokeStyle = "none", lineWidth = 0, x = 0, y = 0) {
        return new CircleCanvasObject(diameter, fillStyle, strokeStyle, lineWidth, x, y);
    }
    static Line(
        strokeStyle = "none",
        lineWidth = 0,
        ax = 0, ay = 0, bx = 0, by = 0) {
        return new LineCanvasObject(strokeStyle, lineWidth, ax, ay, bx, by);
    }
    static Text(content = "", font = "12px sans-serif", fillStyle = "black", x = 0, y = 0) {
        return new TextCanvasObject(content, font, fillStyle, x, y);
    }
    static Group(...spritesToGroup) {
        return new ObjectGrouper(spritesToGroup);
    }
}

class DisplayObject {
    constructor(width = 0, height = 0) {
        //The sprite's position and size
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;

        //Rotation, alpha, visible and scale properties
        this.rotation = 0;
        this.alpha = 1;
        this.visible = true;
        this.scaleX = 1;
        this.scaleY = 1;

        //`pivotX` and `pivotY` let you set the sprite's axis of rotation
        this.pivotX = 0.5;
        this.pivotY = 0.5;

        //Add `vx` and `vy` (velocity) variables that will help us move the sprite
        this.vx = 0;
        this.vy = 0;

        //A "private" `_layer` property
        this._layer = 0;

        //A `children` array on the sprite that will contain all the
        //child sprites in this container
        this.children = [];

        //The sprite's `parent` property 
        this.parent = undefined;

        //The sprite's `children` array
        // this.children = [];

        //Optional drop shadow properties.
        //Set `shadow` to `true` if you want the sprite to display a
        //shadow
        this.shadow = false;
        this.shadowColor = "rgba(100, 100, 100, 0.5)";
        this.shadowOffsetX = 3;
        this.shadowOffsetY = 3;
        this.shadowBlur = 3;

        //Optional blend mode property
        this.blendMode = undefined;

        //Properties for advanced features: 

        //Image states and animation
        this.frames = [];
        this.loop = true;
        this._currentFrame = 0;
        this.playing = false;

        //Can the sprite be dragged? 
        this._draggable = undefined;

        //Is the sprite circular? If it is, it will be given a `radius`
        //and `diameter`
        this._circular = false;

        //Is the sprite `interactive`? If it is, it can become click-able
        //or touchable
        this._interactive = false;

        //The sprite's previous x and y positions
        this.previousX = 0;
        this.previousY = 0;
    }

    /* Essentials */

    //Global position
    get gx() {
        if (this.parent) {

            //The sprite's global x position is a combination of
            //its local x value and its parent's global x value
            return this.x + this.parent.gx;
        } else {
            return this.x;
        }
    }
    get gy() {
        if (this.parent) {
            return this.y + this.parent.gy;
        } else {
            return this.y;
        }
    }

    //Depth layer
    get layer() {
        return this._layer;
    }
    set layer(value) {
        this._layer = value;
        if (this.parent) {
            //Sort the sprite’s parent’s `children` array so that sprites with a
            //higher `layer` value are moved to the end of the array
            this.parent.children.sort((a, b) => a.layer - b.layer);
        }
    }

    //The `addChild` method lets you add sprites to this container
    addChild(sprite) {
        //Remove the sprite from its current parent, if it has one, and
        //the parent isn't already this object
        if (sprite.parent) {
            sprite.parent.removeChild(sprite);
        }
        //Make this object the sprite's parent and
        //add it to this object's `children` array
        sprite.parent = this;
        this.children.push(sprite);
    }

    //The `removeChild` method lets you remove a sprite from its
    //parent container
    removeChild(sprite) {
        if (sprite.parent === this) {
            this.children.splice(this.children.indexOf(sprite), 1);
        } else {
            throw new Error(sprite + "is not a child of " + this);
        }
    }

    //Getters that return useful points on the sprite
    get halfWidth() {
        return this.width / 2;
    }
    get halfHeight() {
        return this.height / 2;
    }
    get centerX() {
        return this.x + this.halfWidth;
    }
    get centerY() {
        return this.y + this.halfHeight;
    }

    /* Conveniences */

    //A `position` getter. It returns an object with x and y properties
    get position() {
        return { x: this.x, y: this.y };
    }

    //A `setPosition` method to quickly set the sprite's x and y values
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    //The `localBounds` and `globalBounds` methods return an object
    //with `x`, `y`, `width`, and `height` properties that define
    //the dimensions and position of the sprite. This is a convenience
    //to help you set or test boundaries without having to know
    //these numbers or request them specifically in your code.
    get localBounds() {
        return {
            x: 0,
            y: 0,
            width: this.width,
            height: this.height
        };
    }
    get globalBounds() {
        return {
            x: this.gx,
            y: this.gy,
            width: this.gx + this.width,
            height: this.gy + this.height
        };
    }

    //`empty` is a convenience property that will return `true` or
    //`false` depending on whether or not this sprite's `children`
    //array is empty
    get empty() {
        if (this.children.length === 0) {
            return true;
        } else {
            return false;
        }
    }

    //The "put" methods help you position 
    //another sprite in and around this sprite. You can position
    //sprites relative to this sprite's center, top, eight, bottom or
    //left sides. The `xOffset` and `yOffset`
    //arguments determine by how much the other sprite's position
    //should be offset from the position. 
    //In all these methods, `b` is the second sprite that is being
    //positioned relative to the first sprite (this one), `a`

    //Center `b` inside `a`
    putCenter(b, xOffset = 0, yOffset = 0) {
            let a = this;
            b.x = (a.x + a.halfWidth - b.halfWidth) + xOffset;
            b.y = (a.y + a.halfHeight - b.halfHeight) + yOffset;
        }
        //Position `b` above `a`
    putTop(b, xOffset = 0, yOffset = 0) {
            let a = this;
            b.x = (a.x + a.halfWidth - b.halfWidth) + xOffset;
            b.y = (a.y - b.height) + yOffset;
        }
        //Position `b` to the right of `a`
    putRight(b, xOffset = 0, yOffset = 0) {
            let a = this;
            b.x = (a.x + a.width) + xOffset;
            b.y = (a.y + a.halfHeight - b.halfHeight) + yOffset;
        }
        //Position `b` below `a`
    putBottom(b, xOffset = 0, yOffset = 0) {
            let a = this;
            b.x = (a.x + a.halfWidth - b.halfWidth) + xOffset;
            b.y = (a.y + a.height) + yOffset;
        }
        //Position `b` to the left of `a`
    putLeft(b, xOffset = 0, yOffset = 0) {
        let a = this;
        b.x = (a.x - b.width) + xOffset;
        b.y = (a.y + a.halfHeight - b.halfHeight) + yOffset;
    }

    //Some extra conveniences for working with child sprites

    //Swap the depth layer positions of two child sprites
    swapChildren(child1, child2) {
        let index1 = this.children.indexOf(child1),
            index2 = this.children.indexOf(child2);
        if (index1 !== -1 && index2 !== -1) {
            //Swap the indexes
            child1.childIndex = index2;
            child2.childIndex = index1;
            //Swap the array positions
            this.children[index1] = child2;
            this.children[index2] = child1;
        } else {
            throw new Error(`Both objects must be a child of the caller ${this}`);
        }
    }

    //`add` and `remove` let you add and remove many sprites at the same time
    add(...spritesToAdd) {
        spritesToAdd.forEach(sprite => this.addChild(sprite));
    }
    remove(...spritesToRemove) {
        spritesToRemove.forEach(sprite => this.removeChild(sprite));
    }

    /* Advanced features */

    //If the sprite has more than one frame, return the 
    //value of `_currentFrame`
    get currentFrame() {
        return this._currentFrame;
    }

    //The `circular` property lets you define whether a sprite
    //should be interpreted as a circular object. If you set
    //`circular` to `true`, the sprite is given `radius` and `diameter`
    //properties. If you set `circular` to `false`, the `radius`
    //and `diameter` properties are deleted from the sprite
    get circular() {
        return this._circular;
    }
    set circular(value) {

        //Give the sprite `diameter` and `radius` properties
        //if `circular` is `true`
        if (value === true && this._circular === false) {
            Object.defineProperties(this, {
                diameter: {
                    get() {
                        return this.width;
                    },
                    set(value) {
                        this.width = value;
                        this.height = value;
                    },
                    enumerable: true,
                    configurable: true
                },
                radius: {
                    get() {
                        return this.halfWidth;
                    },
                    set(value) {
                        this.width = value * 2;
                        this.height = value * 2;
                    },
                    enumerable: true,
                    configurable: true
                }
            });
            //Set this sprite's `_circular` property to `true`
            this._circular = true;
        }
        //Remove the sprite's `diameter` and `radius` properties
        //if `circular` is `false`
        if (value === false && this._circular === true) {
            delete this.diameter;
            delete this.radius;
            this._circular = false;
        }
    }

    //Is the sprite draggable by the pointer? If `draggable` is set
    //to `true`, the sprite is added to a `draggableSprites`
    //array. All the sprites in `draggableSprites` are updated each
    //frame to check whether they're being dragged
    get draggable() {
        return this._draggable;
    }
    set draggable(value) {
        if (value === true) {

            //Push the sprite into the `draggableSprites` array
            draggableSprites.push(this);
            this._draggable = true;
        }
        //If it's `false`, remove it from the `draggableSprites` array
        if (value === false) {

            //Splice the sprite from the `draggableSprites` array
            draggableSprites.splice(draggableSprites.indexOf(this), 1);
        }
    }

    //Is the sprite interactive? If `interactive` is set to `true`,
    //the sprite is run through the `makeInteractive` function.
    //`makeInteractive` makes the sprite sensitive to pointer
    //actions. It also adds the sprite to the `buttons` array,
    //which is updated each frame
    get interactive() {
        return this._interactive;
    }
    set interactive(value) {
        if (value === true) {

            //Add interactive properties to the sprite
            //so that it can act like a button
            makeInteractive(this);

            //Add the sprite to the global `buttons` array so
            //it can be updated each frame
            buttons.push(this);

            //Set this sprite’s private `_interactive` property to `true`
            this._interactive = true;
        }
        if (value === false) {

            //Remove the sprite's reference from the 
            //`buttons` array so that it it's no longer affected
            //by mouse and touch interactivity
            buttons.splice(buttons.indexOf(this), 1);
            this._interactive = false;
        }
    }
}


class RectangleCanvasObject extends DisplayObject {
    constructor(
        width = 32,
        height = 32,
        fillStyle = "gray",
        strokeStyle = "none",
        lineWidth = 0,
        x = 0,
        y = 0
    ) {
        super();

        Object.assign(this, {
            width,
            height,
            fillStyle,
            strokeStyle,
            lineWidth,
            x,
            y
        });
        this.mask = false;
    }

    render(ctx) {
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.fillStyle = this.fillStyle;
        ctx.beginPath();
        ctx.rect(-this.width * this.pivotX, -this.height * this.pivotY, this.width, this.height);
        if (this.strokeStyle !== "none") ctx.stroke();
        if (this.fillStyle !== "none") ctx.fill();
        if (this.mask && this.mask === true) ctx.clip();
    }
}

class CircleCanvasObject extends DisplayObject {
    constructor(
        diameter = 32,
        fillStyle = "gray",
        strokeStyle = "none",
        lineWidth = 0,
        x = 0,
        y = 0
    ) {
        super();

        this.circular = true;

        Object.assign(this, { diameter, fillStyle, strokeStyle, lineWidth, x, y });

        this.mask = false;
    }
    render(ctx) {
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.fillStyle = this.fillStyle;
        ctx.beginPath();
        ctx.arc(
            this.radius + (-this.diameter * this.pivotX),
            this.radius + -(this.diameter * this.pivotY),
            this.radius,
            0, 2 * Math.PI,
            false
        );
        if (this.strokeStyle !== "none") ctx.stroke();
        if (this.fillStyle !== "none") ctx.fill();
        if (this.mask && this.mask === true) ctx.clip();
    }
}

class LineCanvasObject extends DisplayObject {
    constructor(
        strokeStyle = "none",
        lineWidth = 0,
        ax = 0, ay = 0, bx = 0, by = 0
    ) {
        super();
        Object.assign(this, { strokeStyle, lineWidth, ax, ay, bx, by });

        this.lineJoin = "rounded";
    }
    render(ctx) {
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.lineJoin = this.lineJoin;
        ctx.beginPath();
        ctx.moveTo(this.ax, this.ay);
        ctx.lineTo(this.bx, this.by);
        if (this.strokeStyle !== "none") ctx.stroke();
    }
}

class TextCanvasObject extends DisplayObject {
    constructor(
        content = "",
        font = "12px sans-serif",
        fillStyle = "black",
        x, y
    ) {
        super();

        Object.assign(this, { content, font, fillStyle, x, y });

        this.textBaseline = "top";

        this.strokeText = "none";
    }
    render(ctx) {
        ctx.font = this.font;
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.fillStyle = this.fillStyle;

        if (this.width === 0) this.width = ctx.measureText(this.content).width;
        if (this.height === 0) this.height = ctx.measureText("M").width;

        ctx.translate(-this.width * this.pivotX, -this.height * this.pivotY);
        ctx.textBaseline = this.textBaseline;
        ctx.fillText(
            this.content,
            0,
            0
        );
        if (this.strokeText !== "none") ctx.strokeText();
    }
}

class ObjectGrouper extends DisplayObject {
    constructor(...spritesToGroup) {


        super();


        spritesToGroup.forEach(sprite => this.addChild(sprite));
    }

    addChild(sprite) {
        if (sprite.parent) {
            sprite.parent.removeChild(sprite);
        }
        sprite.parent = this;
        this.children.push(sprite);


        this.calculateSize();
    }

    removeChild(sprite) {
        if (sprite.parent === this) {
            this.children.splice(this.children.indexOf(sprite), 1);


            this.calculateSize();
        } else {
            throw new Error(`${sprite} is not a child of ${this}`);
        }
    }

    calculateSize() {


        if (this.children.length > 0) {


            this._newWidth = 0;
            this._newHeight = 0;


            this.children.forEach(child => {


                if (child.x + child.width > this._newWidth) {


                    this._newWidth = child.x + child.width;
                }
                if (child.y + child.height > this._newHeight) {
                    this._newHeight = child.y + child.height;
                }
            });


            this.width = this._newWidth;
            this.height = this._newHeight;
        }
    }
}