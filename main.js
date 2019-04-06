/**
* Responsible for html, layout, button functionality, etc.
* Initializing the pong.js file
*/

/** Ultimate setup function */
window.onload = function(){
    // Slider js
    var botSpeedSlider = document.getElementById("botSpeedSlider");
    var botSpeedValue = document.getElementById("botSpeedValue");
    botSpeedValue.innerHTML = "Bot speed value: " + botSpeedSlider.value;
    botSpeedSlider.oninput = function() {
        botSpeedValue.innerHTML = "Bot speed value: " + this.value;
    }

    var ballSpeedSlider = document.getElementById("ballSpeedSlider");
    var ballSpeedValue = document.getElementById("ballSpeedValue");
    ballSpeedValue.innerHTML = "Ball speed value: " + ballSpeedSlider.value;
    ballSpeedSlider.oninput = function() {
        ballSpeedValue.innerHTML = "Ball speed value: " + this.value;
    }

    // Button js
    var resetTrainingBtn = document.getElementById("resetTrainingBtn");
    var trainBtn = document.getElementById("trainBtn");
    var testBtn = document.getElementById("testBtn");
    trainBtn.onclick = function(){
        if(!trainBtn.classList.contains("active")){
            trainBtn.classList.add("active");
            testBtn.classList.remove("active");
            scoreboard.end();
            switch_to_train();
        }
    }
    testBtn.onclick = function(){
        if(!testBtn.classList.contains("active")){
            testBtn.classList.add("active");
            trainBtn.classList.remove("active");
            scoreboard.start();
            switch_to_test();
        }
    }
    resetTrainingBtn.onclick = function(){
        resetTrainingBtn.classList.add("active");
        trainBtn.classList.remove("active");
        testBtn.classList.remove("active");
        setTimeout(function() {
            resetTrainingBtn.classList.remove("active");
        }, 500)
        scoreboard.end();
        switch_to_neither();
    }

    var fooBtn = document.getElementById("foo");
    var somebool = false;
    var saveSth = [];
    fooBtn.onclick = function(){
        if(somebool){
            // fooF();
            // context.clearRect(0, 0, canvas.width, canvas.height);
            // var recreate_data = context.createImageData(canvas.width/data_collector.simplify_pixels, canvas.height/data_collector.simplify_pixels);
            // for(var i = 0; i < saveSth.length; i++){
            //     for(var j = 0; j < 3; j++){
            //         recreate_data.data[(i*4) + j] = saveSth[i] * 255;
            //     }
            //     recreate_data.data[(i*4) + 3] = 255; // Opacity
            // }
            // context.putImageData(recreate_data,0,0);
            fooF();
            var original_data = context.getImageData(0,0,canvas.width,canvas.height);
            var imageObj = new Image();
            imageObj.onload = function() {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(imageObj, 0, 0, 105, 60);
            };
            imageObj.src = canvas.toDataURL();
        }
        else{
            saveSth = data_collector.getCombined();
            somebool = true;
        }
    }


    // Initialize the rest
    scoreboard = new Scoreboard();
    fps_handler = new FPS_Handler();
    //Load pong.js
    initializePong();
}

/** Toggling "Bot" or "Player" depending on current control */
function toggleLeftPaddleType(){
    var leftPaddleType = document.getElementById("bottom1");
    if(leftPaddleType.innerHTML === "Bot (Drag paddle to play)"){
        leftPaddleType.innerHTML = "Player";
    }
    else{
        leftPaddleType.innerHTML = "Bot (Drag paddle to play)";
    }
}

/** Class for Scoreboard */
function Scoreboard(){
    this.element = document.getElementById("bottom2");
    this.active = false;
    this.left = 0;
    this.right = 0;
    this.start = function(){
        this.active = true;
        this.left = 0;
        this.right = 0;
        this.element.innerHTML = "0 : 0";
    }
    this.end = function(){
        this.active = false;
        this.left = 0;
        this.right = 0;
        this.element.innerHTML = "- : -";
    }
    this.leftScored = function(){
        this.left++;
        this.element.innerHTML = "" + this.left + " : " + this.right;
    }
    this.rightScored = function(){
        this.right++;
        this.element.innerHTML = "" + this.left + " : " + this.right;
    }
}

function FPS_Handler(){
    this.middleFPS = 0;
    this.howmanyfpsmeas = 0;
    this.t0 = performance.now();
    this.update = function(t1){
        var fps = Math.floor(1000 / (t1 - this.t0));
        this.t0 = t1;
        if(this.howmanyfpsmeas > 10){
            this.howmanyfpsmeas = 0;
            this.middleFPS = 0;
        }
        this.howmanyfpsmeas++;
        this.middleFPS = fps + this.middleFPS;
        document.getElementById("fps").innerHTML = "FPS: " + Math.floor(this.middleFPS/this.howmanyfpsmeas);
    }
}
