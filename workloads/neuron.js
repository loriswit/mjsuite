var N = 3 // iterations

// © 2019 Oleksii Trekhleb <trehleb@gmail.com> | MIT
// https://github.com/trekhleb/nano-neuron/tree/master

function NanoNeuron(w, b) {
    this.w = w;
    this.b = b;
    this.predict = function (x) {
        return x * this.w + this.b;
    }
}

function celsiusToFahrenheit(c) {
    var w = 1.8;
    var b = 32;
    var f = c * w + b;
    return f;
};

function generateDataSets() {
    var xTrain = [];
    var yTrain = [];
    for (var x = 0; x < 100; x += 1) {
        var y = celsiusToFahrenheit(x);
        xTrain.push(x);
        yTrain.push(y);
    }

    var xTest = [];
    var yTest = [];
    for (var x = 0.5; x < 100; x += 1) {
        var y = celsiusToFahrenheit(x);
        xTest.push(x);
        yTest.push(y);
    }

    return [xTrain, yTrain, xTest, yTest];
}

function predictionCost(y, prediction) {
    return Math.pow((y - prediction), 2) / 2; // i.e. -> 235.6
}

function forwardPropagation(model, xTrain, yTrain) {
    var m = xTrain.length;
    var predictions = [];
    var cost = 0;
    for (var i = 0; i < m; i += 1) {
        var prediction = nanoNeuron.predict(xTrain[i]);
        cost += predictionCost(yTrain[i], prediction);
        predictions.push(prediction);
    }
    cost /= m;
    return [predictions, cost];
}

function backwardPropagation(predictions, xTrain, yTrain) {
    var m = xTrain.length;
    var dW = 0;
    var dB = 0;
    for (var i = 0; i < m; i += 1) {
        dW += (yTrain[i] - predictions[i]) * xTrain[i];
        dB += yTrain[i] - predictions[i];
    }
    dW /= m;
    dB /= m;
    return [dW, dB];
}

function trainModel(model, epochs, alpha, xTrain, yTrain) {
    var costHistory = [];

    for (var epoch = 0; epoch < epochs; epoch += 1) {
        var predCost = forwardPropagation(model, xTrain, yTrain);
        var predictions = predCost[0];
        var cost = predCost[1];
        costHistory.push(cost);

        var dWdB = backwardPropagation(predictions, xTrain, yTrain);
        var dW = dWdB[0];
        var dB = dWdB[1];

        nanoNeuron.w += alpha * dW;
        nanoNeuron.b += alpha * dB;
    }

    return costHistory;
}


var w = Math.random(); // i.e. -> 0.9492
var b = Math.random(); // i.e. -> 0.4570
var nanoNeuron = new NanoNeuron(w, b);

var dataSets = generateDataSets();
var xTrain = dataSets[0];
var yTrain = dataSets[1];
var xTest = dataSets[2];
var yTest = dataSets[3];

var epochs = 70000;
var alpha = 0.0005;

var trainingCostHistory
var customPrediction
var startTime = Date.now()

for (var i = 0; i < N; i++) {
    trainingCostHistory = trainModel(nanoNeuron, epochs, alpha, xTrain, yTrain);

    console.log('Cost before the training:', trainingCostHistory[0]); // i.e. -> 4694.3335043
    console.log('Cost after the training:', trainingCostHistory[epochs - 1]); // i.e. -> 0.0000024

    console.log('NanoNeuron parameters:', {w: nanoNeuron.w, b: nanoNeuron.b}); // i.e. -> {w: 1.8, b: 31.99}

    var testCost = forwardPropagation(nanoNeuron, xTest, yTest)[1];
    console.log('Cost on new testing data:', testCost); // i.e. -> 0.0000023

    var tempInCelsius = 70;
    customPrediction = nanoNeuron.predict(tempInCelsius);
    console.log('NanoNeuron "thinks" that ' + tempInCelsius + '°C in Fahrenheit is:', customPrediction); // -> 158.0002
    console.log('Correct answer is:', celsiusToFahrenheit(tempInCelsius)); // -> 158
}

console.log(customPrediction)
console.log(Date.now() - startTime)
