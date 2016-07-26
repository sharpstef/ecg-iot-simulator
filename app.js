/*eslint-env node*/
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
/*************************************************************************************************

  Define global variables for NPM packages and Cloud Foundry environment

*************************************************************************************************/
var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    cfenv = require("cfenv"),
    appEnv = cfenv.getAppEnv(),
    session = require('express-session'),
    request = require("request"),
    Client = require("ibmiotf"),
    http = require('http').Server(app),
    io = require('socket.io')(http);

/************************************************************************************************* 
  
  Start the server and socket.io and display the index page out of the public directory
 
*************************************************************************************************/
 var deviceClient;
 
// serve the files out of ./public as our main files
app.use(bodyParser.urlencoded({
    extended: false
}));
// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

http.listen(appEnv.port, function() {
    console.log('listening on ' + appEnv.port);
});

io.on('connection', function(socket) {
    console.log("Sockets connected.");

    socket.on('disconnect', function() {
        console.log("Socket disconnected.");
    });

    socket.on('newData', function(data, err) {
        if (err) {
            console.log("Socket error: " + err);
        } else {
            deviceClient.publish("status", "json", data);
        }

    });

    /*************************************************************************************************
         
          Client driven events
         
    *************************************************************************************************/
    // Received request to connect to the IoT Foundation
    app.post('/iotConnect', function(req, res) {
        console.log("Received request to connect to IoT Foundation" + JSON.stringify(req.body));

        connectIoT(req.body);
		
		res.send("Connected");
    });
    
    app.get('/iotDisconnect', function(req, res) {
        console.log("Received request to disconnect.");

        deviceClient.disconnect();

        return res;
    });

    /*************************************************************************************************
         
          Connection and device events
         
    *************************************************************************************************/

    function connectIoT(data) {

        // Set config to user entered data
        var config = {
            "org": data.org,
            "id": data.device,
            "domain": "internetofthings.ibmcloud.com",
            "type": data.type,
            "auth-method": "token",
            "auth-token": data.token
        };

        // IoT Events. Device connection and log out the device status.
        deviceClient = new Client.IotfDevice(config);

        deviceClient.connect();

        deviceClient.on("connect", function() {
            console.log("Connected to broker!");

        });

        // Received command from IoT Foundation
        deviceClient.on("command", function(commandName, format, payload, topic) {
            if (commandName === "reset") {
                console.log("Received error from logger. Resetting device.");
                //function to be performed for this command
                socket.broadcast.emit("reset",payload);

            } else {
                console.log("Command not supported.. " + commandName);
            }
        });

        deviceClient.on("disconnect", function() {

            socket.broadcast.emit("iotDisconnected", "");

        });

        deviceClient.on("error", function(err) {
            console.log("Error : " + err);
            socket.broadcast.emit("iotError", "");
        });
    }
});
