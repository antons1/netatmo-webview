import fetch from 'node-fetch';

import { db } from './firebase';

class NetatmoSuccess {
    constructor(message, data) {
        this.message = message;
        this.data = data;
    }
}

class NetatmoError extends Error {
    constructor(message, data) {
        super(message);
        this.message = message;
        this.name = 'NetatmoError';
        this.data = data;
    }
}

/**
 * callNetatmo - posts a request to netatmo
 * @param {string} url - URL to call 
 * @param {object} data - Data to send. key => value
 * @param {boolean} debug - Will print debug info to console.log
 * @returns a JSON promise. Throws the response if status = !OK 
 */
function callNetatmo(url, data, debug) {
    const params = new URLSearchParams();
    Object.keys(data).forEach((key) => params.append(key, data[key]));

    return fetch(url, {
        method: 'post',
        body: params,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
    }).then((res) => {
        if(debug) {
            console.log(res.ok);
            console.log(res.status);
            console.log(res.statusText);
            console.log(res.headers.get('content-type'));
        }

        if(!res.ok) return res.json().then((data) => { throw new NetatmoError(`${res.status}: ${res.statusText}`, { status: res.status, statusText: res.statusText, data })});
        else return res.json();
    });
}

/**
 * Get app settings from firebase
 * @param {Object} prev - `prev` is merged with settings retrieved from firebase
 * @returns Promise (object) with settings from firebase, merged with `prev`
 */
function getSettingsFromFirebase(prev) {
    return db.ref('settings').once('value').then((data) => Promise.resolve(Object.assign({}, prev, data.val())));
}

/**
 * Get app access data from firebase
 * @param {Object} prev - `prev` is merged with access data retrieved from firebase
 * @returns Promise (object) with access data from firebase, merged with `prev`
 */
function getAccessTokensFromFirebase(prev) {
    return db.ref('access').once('value').then((data) => Promise.resolve(Object.assign({}, prev, data.val())));
}

/**
 * Refreshes access token towards Netatmo with refresh token from Firebase
 * @returns Promise with data from Netatmo
 * @throws `NetatmoError`
 */
function refreshAuthenticationToken() {
    return getSettingsFromFirebase({})
        .then(getAccessTokensFromFirebase)
        .then((settings) => callNetatmo("https://api.netatmo.com/oauth2/token", Object.assign(settings, { grant_type: 'refresh_token' })))
        .then((data) => new NetatmoSuccess('Refreshed access token', data))
        .catch((err) => { throw new NetatmoError('Failed refreshing access token', err) });
}

/**
 * Determines required authentication action towards Netatmo
 * @returns Promise eventually containing an `NetatmoSuccess` instance with `data: { method: 'PASSWORD'|'NONE'|'REFRESH', fn: <authFunction> }`
 * @throws `NetatmoError`
 */
function getAuthenticationMethod() {
    return getSettingsFromFirebase({})
        .then(getAccessTokensFromFirebase)
        .then((settings) => {
            const {
                access_token,
                refresh_token,
                access_token_time,
                access_token_timeout
            } = settings;
            if(!access_token && !refresh_token)
                return Promise.resolve(new NetatmoSuccess('Access and Refresh token is empty, log in with username and password', { method: 'PASSWORD', fn: usernameAndPasswordAuthentication }));
            else if (access_token !== "" && ((new Date().getTime()) - (access_token_time + access_token_timeout)) < 0)
                return Promise.resolve(new NetatmoSuccess('Already authenticated', { method: 'NONE', fn: () => Promise.resolve() }));
            else 
                return Promise.resolve(new NetatmoSuccess('Access token is expired, get new with refresh token', { method: 'REFRESH', fn: refreshAuthenticationToken }));
        })
        .catch((err) => { throw new NetatmoError('Something went wrong trying to assess login method', { err, settings })})
}

/**
 * Gets available station data from Netatmo, assuming application is authenticated
 * @returns Promise eventually containing an `NetatmoSuccess` instance with station data
 * @throws `NetatmoError`
 */
function getStationData() {
    return getSettingsFromFirebase({})
        .then(getAccessTokensFromFirebase)
        .then((settings) => callNetatmo("https://api.netatmo.com/api/getstationsdata", settings))
        .then((data) => new NetatmoSuccess('Got station data', transformStationData(data)))
        .catch((err) => { throw new NetatmoError('Failed getting stations data', err) });
}

/**
 * Takes response from Netatmo and transform to ViewModel
 * @param {Object} originalData - Netatmo response
 * @returns Object containing data from Netatmo in a ViewModel shape
 */
function transformStationData(originalData) {
    const device = originalData.body.devices[0];
    const outside = originalData.body.devices[0].modules[0];
    const newData = {
        stationName: device.station_name,
        reachable: device.reachable,
        position: device.place,
        inside: {
            name: device.module_name,
            co2: device.dashboard_data.CO2,
            humidity: device.dashboard_data.Humidity,
            noise: device.dashboard_data.Noise,
            pressure: device.dashboard_data.Pressure,
            absoulutePressure: device.dashboard_data.AbsolutePressure,
            temperature: device.dashboard_data.Temperature,
            minTemperature: device.dashboard_data.min_temp,
            maxTemperature: device.dashboard_data.max_temp,
            minTemperatureTime: device.dashboard_data.date_min_temp,
            maxTemperatureTime: device.dashboard_data.date_max_temp,
            temperatureTrend: device.dashboard_data.temp_trend,
            pressureTrend: device.dashboard_data.pressure_trend
        },
        outside: {
            name: outside.module_name,
            temperature: outside.dashboard_data.Temperature,
            humidity: outside.dashboard_data.Humidity,
            minTemperature: outside.dashboard_data.min_temp,
            maxTemperature: outside.dashboard_data.max_temp,
            minTemperatureTime: outside.dashboard_data.date_min_temp,
            maxTemperatureTime: outside.dashboard_data.date_max_temp,
            temperatureTrend: outside.dashboard_data.temp_trend,
            batteryStatus: outside.battery_percent,
            reachable: outside.reachable
        }
    };

    return newData;
}

/**
 * Authenticates toward Netatmo using username and password, stores auth tokens in firebase
 * @param {string} username - Netatmo username
 * @param {string} password - Netatmo password
 * @returns Promise with success message
 * @throws `NetatmoError`
 */
export function usernameAndPasswordAuthentication(username, password) {
    return getSettingsFromFirebase({})
        .then(getAccessTokensFromFirebase)
        .then((settings) => callNetatmo("https://api.netatmo.com/oauth2/token", Object.assign(settings, { username, password, grant_type: 'password' })))
        .then((data) => {
            db.ref('access').set(data);
            return new NetatmoSuccess('Signed in with username and password', data)
        })
        .catch((err) => { throw new NetatmoError('Failed signing in with username and password', err) });
}

/**
 * Loads station data from Netatmo and stores it to firebase, if auth_token or refresh_token is valid. Else throws an error
 * @returns Promise eventually containing station data
 * @throws NetatmoError
 */
export function loadData() {
    return getAuthenticationMethod()
        .then(({ data }) => {
            if(data.method === 'PASSWORD') throw new NetatmoError('Username and password required to authenticate', { loginRequired: true });
            else return data.fn();
        })
        .then(getStationData)
        .then((data) => {
            const date = new Date();
            const pathStr = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}/${date.getTime()}`;
            const fbData = {};
            fbData[pathStr] = data.data;
            db.ref("data").update(fbData);
            return new NetatmoSuccess('Got data, stored to firebase', data);
        });
}