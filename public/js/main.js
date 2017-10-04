/*eslint-env jquery, browser*/
/*globals google */
//------------------------------------------------------------------------------------------------
// Frequency/Temperature and ECG Simulator
//
// Authors: David Carew @djccarew <david.carew@us.ibm.com>
//          Stefania Kaczmarczyk @slkaczma <slkaczma@us.ibm.com>
//
//------------------------------------------------------------------------------------------------
// The MIT License (MIT)
//
// Copyright (c) 2016 IBM
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//------------------------------------------------------------------------------------------------
google.load('visualization', '1', {
    packages: ['corechart']
});

/*************************************************************************************************

  Define global variables and set HTML properties to defaults

*************************************************************************************************/
var updateInterval = 500; // How often to update the data in the graph
var dps = []; // Graph data
var dataLength = 1025; // number of dataPoints visible initially
var numRecords = 7681;
var temperature = 0;
var iterations = 0;
var maxValue = 4.0;
var minValue = 0.0;

// Additional variables if the user selects ECG data
var mode="volt"; // volt - Voltage and Temperature simulation, ecg - ECG
var beats = 0;

// Attach a location to each sensor to represent a network of sensors
var myLocation = "-97.769134700000000000:30.263691100000000000";
var longitude = -97.769134700000000000;
var latitude = 30.263691100000000000;

// Variables for the IoT connection
var deviceId = "";
var deviceType = "";
var orgId = "";
var authToken = "";

// Set IoT connection and simulator run status to false
var timerId;
var connected = false;
var simulatorRunning = false;

// Initialize the labels on the buttons
$('#Connect').prop('disabled', true);
$('#Run').prop('disabled', true);
$('#Settings').prop('disabled', false);

/*************************************************************************************************

  Socket.io Events and Initial Setup

*************************************************************************************************/
// Create a client connection to server with socket.io
var socket = io({
    autoConnect: true
});

socket.connect();

socket.on("connect", function() {
    console.log("Connected to socket server");
});

socket.on("disconnect", function() {
	$.get('/iotDisconnect', function(res) {

            log(res);

        }); // End get
});

// Do initial setup for the graph and data
initialize();

// Update the interface when user successfully disconnects from the IoT Foundation
socket.on("iotDisconnected", function() {
    if (simulatorRunning) {
        clearInterval(timerId);
        $('#Run').prop('disabled', true);
        simulatorRunning = false;
    }

    // Disconnected from broker, reset the labels and buttons on index page
    log('Disconnected from IBM IoT');
    connected = false;
    $('#Connect').html('Connect');
    $('#connectionStatus').html('Disconnected');
    $('#connectionStatus').removeClass('connected').addClass('disconnected');
	$('#Settings').prop('disabled', false);

});

// Received reset from the server
socket.on("reset", function() {
	log("Device error detected. Received command to calibrate and restart.");
	startSimulation();

});

// Received reset from the server
socket.on("iotError", function() {
	log("Error with the IoT Foundation. Check your service.");

});

/*************************************************************************************************

  Functions

*************************************************************************************************/
/**
 * log
 * Formats data to be printed in the log on the index.html for the user
 * @param {String} data
 *
 */
function log(data) {
    var now = new Date();
    var prefix = now.toLocaleDateString() + " - " + now.toLocaleTimeString() + " : ";
    var orgContent = $("#logger").val();
    if (orgContent === '')
        $("#logger").val(prefix + data);
    else
        $("#logger").val(orgContent + "\n" + prefix + data);
}

/**
 * iotConnect
 * Sets all of the connection information for the IoT Foundation from user generated values and
 * initiates a post request the server to connect to the broker.
 *
 */
function iotConnect() {

    // Check if a the client already registers a connection. If not, send a POST to the server.
    // If connected then send a disconnect to the IoT Foundation.
    if (!connected) {
        console.log("Sending request to connect to the broker.");

        var data = {
            "org": orgId,
            "type": deviceType,
            "token": authToken,
            "device": deviceId
        };

        console.log("Data for IoT: " + data);

        $.post('/iotConnect', data, function(res) {

            // Broker is connected, enable the simulation button
            connected = true;
            $('#Run').prop('disabled', false);
	        $('#Settings').prop('disabled', true);
            $('#Connect').html('Disconnect');
            $('#connectionStatus').html('Connected');
            $('#connectionStatus').removeClass('disconnected').addClass('connected');

			// Log out the message to the web console and the index log feed
            console.log("Successfully connected to the IoT broker");
            log('Successfully connected to the IoT broker');

        }); // End post
    } else {
        $.get('/iotDisconnect', function(res) {

            log(res);

        }); // End get
    }
}

/**
 * startSimulation
 * Reset simulation display and create the setInterval function for updating.
 *
 */
function startSimulation() {
    if (dps.length > 0) {
        dps = [];
        minValue = 0.0;
        maxValue = 4.0;

        // Redraw the google chart
        drawChart(dps);

        iterations = 0; // Number of times the simulator has run
        beats = 0; // Number of heart beats
    }

    timerId = setInterval(function() {
        updateData();
    }, updateInterval);

}

/**
 * updateData
 * Update the data in the graph and send a new data message to the IoT Foundation
 *
 */
function updateData() {
    var numItems = 128;
    var startIndex = 0;
    var voltage;

    ++iterations;

    // If the dps array is smaller than the number of initial data points
    if (dps.length < dataLength) {
        startIndex = dps.length;

        if (startIndex === 0) {
            numItems = 129;
        }

        for (var i = 0; i < numItems; i++) {
            // Push a value from the ecgsyn3.js file into the dps array for display
            dps.push([randomData[i + startIndex][0], randomData[i + startIndex][1] * randAdjust()]);
        }

        // Redraw the google chart
        drawChart(dps);

    } else {

        maxValue = maxValue + 0.500;
        minValue = minValue + 0.500;

        if (maxValue > 30.0) {
            // When the time iteration passes 30 seconds kill the simulation
            clearInterval(timerId);
            simulatorRunning = false;
            return;
        }

        dps = [];

        for (var j = 0; j < numRecords; j++) {
            if (randomData[j][0] >= minValue && randomData[j][0] <= maxValue) {
                dps.push([randomData[j][0], randomData[j][1] * randAdjust()]);
            }
        }

        drawChart(dps);
    }

    // If more than one record has displayed and there is an even number then send data to the cloud
    if (iterations > 1 && iterations % 2 === 0) {
    	    var data;

    	    if (mode === "ecg") {
    	    	    data = generateData(++beats);
    	    	} else {
    	    		voltage = randomData[Math.floor(Math.random() * randomData.length)][1];
            data = generateData(voltage);
        }

        console.log(JSON.stringify(data));

        // Send data to server to publish to MQTT
        socket.emit('newData', data);
    }
}

/**
 * generateData
 * Set IoT data depending on the run mode for the simulator.
 * @param {String} n
 *
 */
function generateData(n) {
    var returnValue = {};
    var now = new Date();

    // If the user selected ECG then use heartbeat data otherwise use voltage
    if (mode === "ecg") {

        returnValue = {
            d: {
                hrMean: randomInt(98, 103),
                numNormal: n,
                location: myLocation,
                timedate: encodeDate(now),
                timems: Date.now(),
                RR: randomInt(580, 645),
                numTotalBeats: n,
                longitude: longitude,
                latitude: latitude,
                deviceId: deviceId
            }
        };

    } else {
    	    // Set a critical temperature for any value in the negative range
    	    if(n<0){
    	    	    temperature = randomDec(30.00,35.00);
    	    } else {
    	    	    temperature = randomDec(11.00,14.00);
    	    }

        returnValue = {
            d: {
                location: myLocation,
                timedate: encodeDate(now),
                timems: Date.now(),
                voltage: n,
                temperature: temperature,
                longitude: longitude,
                latitude: latitude,
                deviceId: deviceId
            }
        };

    }

    return returnValue;
}

/**
 * initialize
 * Null out the chart. Get the location of the user for the sensor location.
 *
 */
function initialize() {
    drawChart([]);
    $('#iotCreds')[0].reset();
    // Get location
    if (navigator.geolocation)
        navigator.geolocation.getCurrentPosition(function(position) {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            myLocation = longitude + ':' + latitude;
            console.log("Location : " + myLocation);
        });
    else
        alert('You need a HTML5 compatible browser to get geoloaction - a default location will be used');
}

/**
 * drawChart
 * Draw a new version of the Google chart with updated data points.
 * @param {Array} rawData
 *
 */
function drawChart(rawData) {

    var data = new google.visualization.DataTable();
    data.addColumn('number', 'X');
    data.addColumn('number', 'Voltage');

    data.addRows(rawData);

    var options = {
        height: 563,
        legend: {
            position: "none"
        },
        hAxis: {
            title: 'Time (seconds)',
            gridlines: {
                count: -1
            },
            maxValue: maxValue,
            minValue: minValue,
            textStyle: {
                color: 'black',
                fontSize: 10,
                bold: true,
                italic: true,
                fontName: "Verdana"
            }
        },
        vAxis: {
            title: 'Voltage',
            maxValue: 1.50,
            minValue: -0.50,
            gridlines: {
                color: 'transparent'
            }
        }
    };

    var chart = new google.visualization.LineChart(
        document.getElementById('ex0'));

    chart.draw(data, options);

}

/*************************************************************************************************

  Utility Functions

*************************************************************************************************/
function randomInt(begin, end) {
    return Math.floor(Math.random() * (end - begin + 1) + begin);
}

function randomDec(begin,end){
	return (Math.random() * ((end - begin) + 0.05) + begin).toFixed(2);
}

function pad(num) {
    if (num < 10)
        return "0" + num.toString();
    else
        return num.toString();
}

function encodeDate(d) {

    var year = d.getFullYear().toString();
    var month = pad(d.getMonth() + 1);
    var day = pad(d.getDate());
    var hour = pad(d.getHours() + 1);
    var minute = pad(d.getMinutes() + 1);
    var second = pad(d.getSeconds() + 1);

    return [year, month, day, hour, minute, second].join("_");

}

function randAdjust() {
    return randomInt(9700, 10300) / 10000.0;
}

function validateSettings() {
    if ($("#orgId").val() === '') {
        console.log("Org ID is missing");
        return false;
    }
    if ($("#deviceType").val() === '') {
        console.log("Device type is missing");
        return false;
    }
    if ($("#deviceId").val() === '') {
        console.log("Device type is missing");
        return false;
    }
    if ($("#authToken").val() === '') {
        console.log("Auth Token is missing");
        return false;
    }

    return true;
}

/*************************************************************************************************

  Page Load Setup and Button Actions

*************************************************************************************************/
$(document).ready(function() {

    $("#save").click(function() {
        if (validateSettings()) {
            $("#form-content").modal('hide');
            $('#Connect').prop('disabled', false);

            // Set variables equal to form values
            mode = $('#mode').val();
            if (mode == 'ecg') {
              $("#page-header").html("ECG Simulator");
            }
            else if (mode == 'volt') {
              $("#page-header").html("Voltage Simulator");
            }
            deviceId = $('#deviceId').val();
            deviceType = $('#deviceType').val();
            orgId = $('#orgId').val();
            authToken = $('#authToken').val();

            // Display credential accept in log
            $('#settingsStatus').html('Provided');
            $('#settingsStatus').removeClass('disconnected').addClass('connected');
            log("All required parameters provided");
        } else
            $("#errorMessage").text("All values are required");

    });

    $("#Connect").click(function() {

        iotConnect();

    });

    $("#Run").click(function() {

        startSimulation();

    });

});
