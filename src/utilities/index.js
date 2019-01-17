import fetch from 'node-fetch';

/**
 * callNetatmo - posts a request to netatmo
 * @param {string} url - URL to call 
 * @param {object} data - Data to send. key => value
 * @param {boolean} debug - Will print debug info to console.log
 * @returns a JSON promise. Throws the response if status = !OK 
 */
export function callNetatmo(url, data, debug) {
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

        if(!res.ok) throw res.json();
        else return res.json();
    });
}