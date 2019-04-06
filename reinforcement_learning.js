/** Gets and processes image data from canvas*/
function DataCollector(canvas, max_frames, simplify_pixels){
    this.canvas = canvas;
    this.max_frames = max_frames;
    this.simplify_pixels = simplify_pixels; // Leaving out, no merge! For row and column
    this.collection = [];
    this.save_combines = [];
    this.shot_combines = [];
    this.prev_shot_combines = [];
    this.combined = null;;
    this.collect = function(lastMove){
        var original_data = context.getImageData(0,0,this.canvas.width,this.canvas.height).data;
        var processed_data = [];
        var row = [];
        // Using i with i < width * height is far slower than j!!
        var j = 0;
        for(var i = 0; i < (this.canvas.height * this.canvas.width) / (this.simplify_pixels * this.simplify_pixels); i++, j++){
            if(j % (this.canvas.width) == 0){ // Takes care of leaving out rows
                j += (this.canvas.width * (this.simplify_pixels - 1));
            }
            var data = original_data[j*4 * this.simplify_pixels] / 255;
            processed_data.push(data);
        }
        this.collection.push(processed_data);
        if(this.collection.length > this.max_frames){
            this.collection.shift();
        }
        this.combine(lastMove);
    }
    /** Motiontracing */
    this.combine = function(lastMove){
        var combined_frame = new Array(this.collection[0].length).fill(0);
        for(var i = 0; i < this.collection[0].length; i++){
            for(var j = this.collection.length-1; j >= 0; j--){
                var value = this.collection[j][i] * (j / (this.collection.length-1))
                if(combined_frame[i] <= value){ // Fixes white and potential black borders!
                    combined_frame[i] = value;
                }
            }
        }
        this.save_combines.push([combined_frame, lastMove]);
        this.shot_combines.push([combined_frame, lastMove]);
        this.combined = combined_frame;
    }
    this.getCombined = function(lastMove){
        if(!this.combined){
            this.collect(lastMove);
        }
        return this.combined
    }
    this.reset_save_combines = function(){
        this.save_combines = [];
    }
    this.prep_prev_shot_combines = function(){
        this.prev_shot_combines = this.shot_combines;
        this.shot_combines = [];
    }
    this.reset_all = function(){
        this.collection = [];
        this.save_combines = [];
        this.shot_combines = [];
        this.prev_shot_combines = [];
        this.combined = null;
    }
}

function estimate_q_values(frames, positivReward, dif){
    var discount = 0.97;
    var frameArr = [];
    var qValArr = [];
    var reward = 0;
    if(positivReward){reward=1;}else{reward=-1;}
    reward*= dif;
    for(var i = Math.round(frames.length/1.5); i < frames.length; i++){
        frameArr.push(frames[i][0]);
        if(frames[i][1] == 0){
            qValArr.push([(reward * Math.pow(discount,i)), 0, 0]);
        }
        else if(frames[i][1] == 1){
            qValArr.push([0, (reward * Math.pow(discount,i)), 0]);
        }
        else if(frames[i][1] == 2){
            qValArr.push([0, 0, (reward * Math.pow(discount,i))]);
        }
    }
    return {xs: frameArr, ys: qValArr};
}

function ConvNet(){
    this.input_shape = [105,60,1];
    this.learning_rate = 0.15;
    this.optimizer = tf.train.sgd(this.learning_rate);
    var model = tf.sequential();
    model.add(tf.layers.conv2d({inputShape: this.input_shape, kernelSize: 5, filters: 8, strides: 1, activation: 'relu', kernelInitializer: 'VarianceScaling'}));
    model.add(tf.layers.maxPooling2d({poolSize: [2, 2], strides: [2, 2]}));
    model.add(tf.layers.conv2d({kernelSize: 5, filters: 16, strides: 1, activation: 'relu', kernelInitializer: 'VarianceScaling'}));
    model.add(tf.layers.maxPooling2d({poolSize: [2, 2], strides: [2, 2]}));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({units: 3, kernelInitializer: 'VarianceScaling', activation: 'softmax'})); // Could be unit: 1 if no probability used
    model.compile({optimizer: this.optimizer, loss: 'categoricalCrossentropy', metrics: ['accuracy']});
    this.model = model;

    this.train = function(batch){
        batch_size = batch.xs.length;
        // await???
        // console.log(tf.tensor(batch.xs).reshape([batch_size, this.input_shape[0], this.input_shape[1], this.input_shape[2]]), tf.tensor(batch.ys));
        // console.log(tf.tensor(batch.ys[0]));
        // , tf.tensor([[1,1,1]])
        // console.log(tf.tensor(batch.ys[0]).reshape(3,1));
        model.fit(tf.tensor(batch.xs).reshape([batch_size, this.input_shape[0], this.input_shape[1], this.input_shape[2]]), tf.tensor(batch.ys), {batchSize: batch_size, epochs: 1});
    }

    this.action = function(input){
        var pred;
        const s0 = tf.tidy(() =>{
            pred = Array.from(this.model.predict(tf.tensor(input).reshape([1,this.input_shape[0],this.input_shape[1],this.input_shape[2]])).dataSync());
        });
        return pred;
    }
}

function train_pipeline(observ, dif){
    var train_data;
    if(observ === "saved"){
        train_data = estimate_q_values(data_collector.save_combines, true, 1);
        data_collector.reset_save_combines();
    }
    else if(observ === "not_saved"){
        train_data = estimate_q_values(data_collector.save_combines, false, dif);
        data_collector.reset_save_combines(); // Prob useless because not_saved = score -> reset() -> data_collector.reset.all()
    }
    else if(observ === "scored"){
        if(data_collector.prev_shot_combines.length == 0){
            return;
        }
        train_data = estimate_q_values(data_collector.prev_shot_combines, true);
        return;
    }
    else if(observ === "not_scored"){
        if(data_collector.prev_shot_combines.length == 0){
            return;
        }
        train_data = estimate_q_values(data_collector.prev_shot_combines, false);
        return;
    }
    bot.conv_net.train(train_data);
}
