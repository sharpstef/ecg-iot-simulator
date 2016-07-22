# Voltage/Temperature and ECG Internet of Things Simulator

Coming in v2: More sensor data!

##Overview
The ecg-iot-simulator replaces the need for a physical sensor when prototyping applications that use heart rate or voltage/temperature data. The application does not replace authentic data, but instead simulates the type of data expected from these sensors. 

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/slkaczma/ecg-iot-simulator)

##Run the app on Bluemix
1. If you do not already have a Bluemix account, [sign up here](https://console.ng.bluemix.net/registration/)

2. Download and install the [Cloud Foundry CLI](https://github.com/cloudfoundry/cli/releases) tool

3. Clone the app to your local environment from your terminal using the following command:

  ```
  git clone https://github.com/slkaczma/ecg-iot-simulator.git
  ```

4. `cd` into this newly created directory

5. Open the `manifest.yml` file and change the `host` value from `ecgsimulator` to something unique.

  The host you choose will determinate the subdomain of your application's URL:  `<host>.mybluemix.net`

6. Connect to Bluemix in the command line tool and follow the prompts to log in.

  ```
  $ cf api https://api.ng.bluemix.net
  $ cf login
  ```
  
7. OPTIONAL: Create the Watson IoT Foundation service in Bluemix. The service does not need to be bound to the application. Otherwise, use any IoT Foundation you already have. 

  ```
  $ cf create-service iotf-service iotf-service-free simulator-iot
  ```
  
9. Push the app to Bluemix.

  ```
  $ cf push
  ```

##Run the app locally
1. If you do not already have a Bluemix account, [sign up here](https://console.ng.bluemix.net/registration/)

2. Download and install the [Cloud Foundry CLI](https://github.com/cloudfoundry/cli/releases) tool

3. Clone the app to your local environment from your terminal using the following command:

  ```
  git clone https://github.com/slkaczma/ecg-iot-simulator.git
  ```

4. `cd` into this newly created directory

5. Log into your Bluemix account and navigate to the Catalog.

6. OPTIONAL: Create the Watson IoT Foundation service in Bluemix. The service does not need to be bound to the application. Otherwise, use any IoT Foundation you already have. 

  ```
  $ cf create-service iotf-service iotf-service-free simulator-iot
  ```
  
7. Start your app locally with the following commands

  ```
  npm install
  ```
  ```
  node app
  ```

## Troubleshooting

The primary source of debugging information for your Bluemix app is the logs. To see them, run the following command using the Cloud Foundry CLI:

  ```
  $ cf logs ecgsimulator --recent
  ```
For more detailed information on troubleshooting your application, see the [Troubleshooting section](https://www.ng.bluemix.net/docs/troubleshoot/tr.html) in the Bluemix documentation.

## Contribute
We are more than happy to accept external contributions to this project, be it in the form of issues and pull requests. If you find a bug, please report it via the [Issues section](https://github.com/slkaczma/ecg-iot-simulator/issues).

### Contributors
Version 2 of this code is a collaboration between [David Carew](https://github.com/djcarew), [Stefania Kaczmarczyk](https://github.com/slkaczma).

##Privacy Notice
The watsonmoodring sample web application includes code to track deployments to Bluemix and other Cloud Foundry platforms.

The following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service on each deployment:
    * Application Name (application_name)
    * Space ID (space_id)
    * Application Version (application_version)
    * Application URIs (application_uris)

This data is collected from the VCAP_APPLICATION environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the beginning of the `app.js` file.
