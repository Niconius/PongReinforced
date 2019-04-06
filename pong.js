/**
* Implemening the pong environment
* Handeling the player controls and ai movement
*/

function initializePong(){
    canvas = document.getElementById("gc");
    context = canvas.getContext("2d");
    setup();
    interval = setInterval(update, 4); // 1000/(wanted fps)
}

function setup(){
    botSpeedSlider = document.getElementById("botSpeedSlider");
    ballSpeedSlider = document.getElementById("ballSpeedSlider");
    var bot_speed = parseInt(botSpeedSlider.value);
    var ball_speed = parseInt(ballSpeedSlider.value);
    botSpeedSlider.onchange = function(){
        bot_speed = parseInt(botSpeedSlider.value);
        player_hybrid.speedUpdate(bot_speed);
        bot.speedUpdate(bot_speed);
    }
    ballSpeedSlider.onchange = function(){
        ball_speed = parseInt(ballSpeedSlider.value);
        ball.speedUpdate(ball_speed);
    }

    player_hybrid = new HybridPaddle(20, canvas.height/2, 20, 75, bot_speed, true);
    bot = new BotPaddle(canvas.width - 40, canvas.height/2, 20, 75, bot_speed);
    var random = Math.floor(Math.random() * 2);
    if(random==0){random=-1;};
    ball = new Ball(canvas.width/2, canvas.height/2, 20, ball_speed * random, player_hybrid, bot, 45);
    data_collector = null

    function player_control(clientY){
        player_hybrid.y = clientY - ((window.innerHeight - canvas.height) / 2);
    }
    window.addEventListener("mousemove", function(e) {
        if(!player_hybrid.botMode){
            player_control(e.clientY);
        }});
    window.addEventListener("mousedown", function(e) {
        var mousePos_Y = e.clientY - ((window.innerHeight - canvas.height) / 2);
        var mousePos_X = e.clientX - ((window.innerWidth - canvas.width) / 2);
        var grabToleranceFactor = 1.5;
        if(player_hybrid.x / grabToleranceFactor < mousePos_X && (player_hybrid.x + player_hybrid.width) * grabToleranceFactor > mousePos_X &&
            player_hybrid.y / grabToleranceFactor < mousePos_Y && (player_hybrid.y + player_hybrid.height) * grabToleranceFactor > mousePos_Y){

            player_hybrid.botMode = false;
            toggleLeftPaddleType();
            if(scoreboard.active){
                scoreboard.start();
            }
        }
    })
    window.addEventListener("mouseup", function(e) {
        if(!player_hybrid.botMode){
            player_hybrid.botMode = true;
            window.removeEventListener("mousemove", player_control(e.clientY));
            toggleLeftPaddleType();
            if(scoreboard.active){
                scoreboard.start();
            }
        }
    })
}

function reset(ball_direction){
    // TODO: #1
    if(ball_direction === "left"){
        if(ball instanceof Ball){
            ball = new Ball(canvas.width/2, canvas.height/2, 20, parseInt(ballSpeedSlider.value) * -1, player_hybrid, bot, 45);
        }
        else if(ball instanceof RL_Ball){
            ball = new RL_Ball(canvas.width/2, canvas.height/2, 20, parseInt(ballSpeedSlider.value) * -1, player_hybrid, bot, 45);
        }
    }
    else if(ball_direction === "right"){
        if(ball instanceof Ball){
            ball = new Ball(canvas.width/2, canvas.height/2, 20, parseInt(ballSpeedSlider.value) * 1, player_hybrid, bot, 45);
        }
        else if(ball instanceof RL_Ball){
            ball = new RL_Ball(canvas.width/2, canvas.height/2, 20, parseInt(ballSpeedSlider.value) * 1, player_hybrid, bot, 45);
        }
    }
    else{console.log("ERROR. Parameter ball_direction in function reset(ball_direction) in pong.js is neither 'left' nor 'right'");}
    if(data_collector){
        data_collector.reset_all();
    }
    bot.y = canvas.height/2;
    player_hybrid.y = canvas.height/2;
}

function update(){
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
    player_hybrid.update();
    bot.update();
    ball.update();              // ball update before collector update seems right because ball handles estimator
    if(data_collector){
        data_collector.collect(bot.lastMove);
    }
    var t1 = performance.now();
    fps_handler.update(t1);
}

// TODO: #1
// TODO: #3 
// TODO: #4
// TODO: #5
function HybridPaddle(x, y, width, height, vel, botMode){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.startVel = vel;
    this.vel = vel;
    this.botMode = botMode;
    this.speedUpdate = function(newSpeed){
        this.startVel = newSpeed;
    }
    this.update = function(){
        if(this.botMode){
            if((this.y + this.y + this.height)/2 > ball.y){
                this.vel = -this.startVel;
            }
            else if((this.y + this.y + this.height)/2 < ball.y){
                this.vel = this.startVel;
            }
            this.y += this.vel;
        }
        if(this.y < 0){
            this.y = 0;
        }
        else if(this.y + this.height > canvas.height){
            this.y = canvas.height - this.height;
        }
        this.draw();
    }
    this.draw = function(){
        context.fillStyle = "white";
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

function BotPaddle(x, y, width, height, vel){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.startVel = vel;
    this.vel = vel;
    this.speedUpdate = function(newSpeed){
        this.startVel = newSpeed;
    }
    this.update = function(){
        if((this.y + this.y + this.height)/2 > ball.y){
            this.vel = -this.startVel;
        }
        else if((this.y + this.y + this.height)/2 < ball.y){
            this.vel = this.startVel;
        }
        this.y += this.vel;
        if(this.y < 0){
            this.y = 0;
        }
        else if(this.y + this.height > canvas.height){
            this.y = canvas.height - this.height;
        }
        this.draw();
    }
    this.draw = function(){
        context.fillStyle = "white";
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

function RL_Paddle(x, y, width, height, vel){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.vel = vel;
    this.conv_net = new ConvNet();
    this.lastMove = 0; // 0 nothing, 1 up, 2 down
    this.speedUpdate = function(newSpeed){
        this.vel = newSpeed;
    }
    this.update = function(){
        var pred = this.conv_net.action(data_collector.getCombined(this.lastMove));
        // var pred = [(Math.random()*2)-1,(Math.random()*2)-1,(Math.random()*2)-1];
        var p0 = Math.floor((pred[0]+1) * 10);
        var p1 = Math.floor((pred[1]+1) * 10);
        var p2 = Math.floor((pred[2]+1) * 10);
        var x = Math.floor(Math.random() * (p0+p1+p2)) + 1;
        if(x <= p0){this.lastMove=0;}else if(x <= p0+p1){this.y+=this.vel;this.lastMove=1;}else if(x <= p0+p1+p2){this.y-=this.vel;this.lastMove=2;}
        if(this.y < 0){
            this.y = 0;
        }
        else if(this.y + this.height > canvas.height){
            this.y = canvas.height - this.height;
        }
        this.draw();
    }
    this.draw = function(){
        context.fillStyle = "white";
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

function Ball(x, y, side, startVel, paddleLeft, paddleRight, maxBounceAngle){
    this.x = x;
    this.y = y;
    this.side = side;
    this.startVelAbs = Math.abs(startVel);
    this.xVel = startVel * 0.5;
    this.yVel = 0;
    this.paddleLeft = paddleLeft;
    this.paddleRight = paddleRight;
    this.maxBounceAngle = maxBounceAngle;
    this.tolerance = this.startVelAbs * 0.55;
    this.speedUpdate = function(newSpeed){
        this.xVel *= newSpeed / this.startVelAbs;
        this.yVel *= newSpeed / this.startVelAbs;
        this.startVelAbs = newSpeed;
        this.tolerance = newSpeed * 0.55;
    }
    this.update = function(){
        this.x += this.xVel;
        this.y += this.yVel;
        if(this.y < 0 || (this.y + this.side) > canvas.height){
            this.yVel *= -1;
        }
        if((this.x > paddleLeft.x + paddleLeft.width - this.tolerance) && (this.x < paddleLeft.x + paddleLeft.width + this.tolerance)){
            if(this.y >= paddleLeft.y && this.y <= (paddleLeft.y + paddleLeft.height)){
                var intersect = (paddleLeft.y + (paddleLeft.height/2)) - this.y;
                var normalizedIntersect = intersect / (paddleLeft.height/2);
                var angle = normalizedIntersect * this.maxBounceAngle;
                this.xVel = Math.abs(this.startVelAbs * Math.cos(angle));
                this.yVel = this.startVelAbs * -Math.sin(angle);
                if(Math.abs(this.xVel) < this.tolerance){
                    this.yVel *= 0.9;
                    this.xVel = this.tolerance;
                }
            }
            else{
                if(scoreboard.active){
                    scoreboard.rightScored();
                }
                reset("left");
            }
        }
        else if((this.x + this.side > paddleRight.x - this.tolerance) && (this.x + this.side < paddleRight.x + this.tolerance)){
            if(this.y >= paddleRight.y && this.y <= (paddleRight.y + paddleRight.height)){
                var intersect = (paddleRight.y + (paddleRight.height/2)) - this.y;
                var normalizedIntersect = intersect / (paddleRight.height/2);
                var angle = normalizedIntersect * this.maxBounceAngle;
                this.xVel = -1 * Math.abs(this.startVelAbs * Math.cos(angle));
                this.yVel = this.startVelAbs * -Math.sin(angle);
                if(Math.abs(this.xVel) < this.tolerance){
                    this.yVel *= 0.9;
                    this.xVel = -1 * this.tolerance;
                }
            }
            else{
                if(scoreboard.active){
                    scoreboard.leftScored();
                }
                reset("right");
            }
        }
        this.draw();
    }
    this.draw = function(){
        context.fillStyle = "white";
        context.fillRect(this.x, this.y, this.side, this.side);
    }
}

/** Handles train_pipeline */
function RL_Ball(x, y, side, startVel, paddleLeft, paddleRight, maxBounceAngle){
    this.x = x;
    this.y = y;
    this.side = side;
    this.startVelAbs = Math.abs(startVel);
    this.xVel = startVel * 0.5;
    this.yVel = 0;
    this.paddleLeft = paddleLeft;
    this.paddleRight = paddleRight;
    this.maxBounceAngle = maxBounceAngle;
    this.tolerance = this.startVelAbs * 0.55;
    this.speedUpdate = function(newSpeed){
        this.xVel *= newSpeed / this.startVelAbs;
        this.yVel *= newSpeed / this.startVelAbs;
        this.startVelAbs = newSpeed;
        this.tolerance = newSpeed * 0.55;
    }
    this.update = function(){
        this.x += this.xVel;
        this.y += this.yVel;
        if(this.y < 0 || (this.y + this.side) > canvas.height){
            this.yVel *= -1;
        }
        if((this.x > paddleLeft.x + paddleLeft.width - this.tolerance) && (this.x < paddleLeft.x + paddleLeft.width + this.tolerance)){
            if(this.y >= paddleLeft.y && this.y <= (paddleLeft.y + paddleLeft.height)){
                var intersect = (paddleLeft.y + (paddleLeft.height/2)) - this.y;
                var normalizedIntersect = intersect / (paddleLeft.height/2);
                var angle = normalizedIntersect * this.maxBounceAngle;
                this.xVel = Math.abs(this.startVelAbs * Math.cos(angle));
                this.yVel = this.startVelAbs * -Math.sin(angle);
                if(Math.abs(this.xVel) < this.tolerance){
                    this.yVel *= 0.9;
                    this.xVel = this.tolerance;
                }
                train_pipeline("not_scored",1);
            }
            else{
                if(scoreboard.active){
                    scoreboard.rightScored();
                }
                train_pipeline("scored",1);
                reset("left");
            }
        }
        else if((this.x + this.side > paddleRight.x - this.tolerance) && (this.x + this.side < paddleRight.x + this.tolerance)){
            if(this.y >= paddleRight.y && this.y <= (paddleRight.y + paddleRight.height)){
                var intersect = (paddleRight.y + (paddleRight.height/2)) - this.y;
                var normalizedIntersect = intersect / (paddleRight.height/2);
                var angle = normalizedIntersect * this.maxBounceAngle;
                this.xVel = -1 * Math.abs(this.startVelAbs * Math.cos(angle));
                this.yVel = this.startVelAbs * -Math.sin(angle);
                if(Math.abs(this.xVel) < this.tolerance){
                    this.yVel *= 0.9;
                    this.xVel = -1 * this.tolerance;
                }
                data_collector.prep_prev_shot_combines();
                train_pipeline("saved", 1);
            }
            else{
                if(scoreboard.active){
                    scoreboard.leftScored();
                }
                var dif = (Math.abs(this.y - paddleRight.y)/canvas.height)
                train_pipeline("not_saved", dif);
                reset("right");
            }
        }
        this.draw();
    }
    this.draw = function(){
        context.fillStyle = "white";
        context.fillRect(this.x, this.y, this.side, this.side);
    }
}

// TODO: #1
function switch_to_train(){
    data_collector = new DataCollector(canvas, 10, 8);
    player_hybrid = new HybridPaddle(20, canvas.height/2, 20, 75, parseInt(botSpeedSlider.value), true);
    if(!(bot instanceof RL_Paddle)){
        bot = new RL_Paddle(canvas.width - 40, canvas.height/2, 20, 75, parseInt(botSpeedSlider.value));
    }
    else{
        bot.x = canvas.width - 40;
        bot.y = canvas.height/2;
    }
    var random = Math.floor(Math.random() * 2);
    if(random==0){random=-1;};
    // Always init ball after bot
    ball = new RL_Ball(canvas.width/2, canvas.height/2, 20, parseInt(ballSpeedSlider.value) * random, player_hybrid, bot, 45);
}

function switch_to_test(){
    data_collector = new DataCollector(canvas, 10, 8);
    player_hybrid = new HybridPaddle(20, canvas.height/2, 20, 75, parseInt(botSpeedSlider.value), true);
    if(!(bot instanceof RL_Paddle)){
        bot = new RL_Paddle(canvas.width - 40, canvas.height/2, 20, 75, parseInt(botSpeedSlider.value));
    }
    else{
        bot.x = canvas.width - 40;
        bot.y = canvas.height/2;
    }
    var random = Math.floor(Math.random() * 2);
    if(random==0){random=-1;};
    // Always init ball after bot
    ball = new Ball(canvas.width/2, canvas.height/2, 20, parseInt(ballSpeedSlider.value) * random, player_hybrid, bot, 45);
}

function switch_to_neither(){
    data_collector = null;
    player_hybrid = new HybridPaddle(20, canvas.height/2, 20, 75, parseInt(botSpeedSlider.value), true);
    bot = new BotPaddle(canvas.width - 40, canvas.height/2, 20, 75, parseInt(botSpeedSlider.value));
    var random = Math.floor(Math.random() * 2);
    if(random==0){random=-1;};
    // Always init ball after bot
    ball = new Ball(canvas.width/2, canvas.height/2, 20, parseInt(ballSpeedSlider.value) * random, player_hybrid, bot, 45);
}

function fooF(){
    clearInterval(interval);
}
