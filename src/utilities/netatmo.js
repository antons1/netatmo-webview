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

function getSettingsFromFirebase(prev) {
    return db.ref('settings').once('value').then((data) => Promise.resolve(Object.assign({}, prev, data.val())));
}

function getAccessTokensFromFirebase(prev) {
    return db.ref('access').once('value').then((data) => Promise.resolve(Object.assign({}, prev, data.val())));
}

function refreshAuthenticationToken() {
    return getSettingsFromFirebase({})
        .then(getAccessTokensFromFirebase)
        .then((settings) => callNetatmo("https://api.netatmo.com/oauth2/token", Object.assign(settings, { grant_type: 'refresh_token' })))
        .then((data) => new NetatmoSuccess('Refreshed access token', data))
        .catch((err) => { throw new NetatmoError('Failed refreshing access token', err) });
}

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

function getStationData() {
    return getSettingsFromFirebase({})
        .then(getAccessTokensFromFirebase)
        .then((settings) => callNetatmo("https://api.netatmo.com/api/getstationsdata", settings))
        .then((data) => new NetatmoSuccess('Got station data', data))
        .catch((err) => { throw new NetatmoError('Failed getting stations data', err) });
}

export function usernameAndPasswordAuthentication(username, password) {
    return getSettingsFromFirebase({})
        .then(getAccessTokensFromFirebase)
        .then((settings) => callNetatmo("https://api.netatmo.com/oauth2/token", Object.assign(settings, { username, password, grant_type: 'password' })))
        .then((data) => new NetatmoSuccess('Signed in with username and password', data))
        .catch((err) => { throw new NetatmoError('Failed signing in with username and password', err) });
}

export function loadData() {
    return getAuthenticationMethod()
        .then(({ data }) => {
            if(data.method === 'PASSWORD') throw new NetatmoError('Username and password required to authenticate', { loginRequired: true });
            else return data.fn();
        })
        .then(getStationData)
}