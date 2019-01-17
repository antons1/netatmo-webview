import fetch from 'node-fetch';

const data = {
    client_id: "5c405a3fd6e33f11008b4e8e",
    client_secret: "P77Cmy7ZkjU9LRtf1mDuqfOsx2Hq6vbGt",
    username: "haakon@antons1.net",
    password: "SEKUni9ass!",
    grant_type: "password",
    scope: "read_station"
}

const url = "https://api.netatmo.com/oauth2/token";
const params = new URLSearchParams();

Object.keys(data).forEach((key) => params.append(key, data[key]));

let access_token = "5c3e245223720a0c008b8e2f|4a303dbd989996f674f37f032bd8bebd";
let refresh_token = "5c3e245223720a0c008b8e2f|d120e5814fccf8ada5b27911bcaa970b";

if(access_token === "") {
    fetch(url, {
        method: 'post',
        body: params,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        }
    }).then((res) => {
        if(!res.ok) {
           throw new Error("Error request");
        } else {
            console.log("Success request");
        }

        console.log(res.ok);
        console.log(res.status);
        console.log(res.statusText);
        console.log(res.headers.raw());
        console.log(res.headers.get('content-type'));

        return res.json();
    })
    .then((data) => {
        console.log(JSON.stringify(data, null, 2))
        access_token = data.access_token;
        refresh_token = data.refresh_token;
    })
    .catch((err) => {
        
    });
}

const geturl = "https://api.netatmo.com/api/getstationsdata";
const data2 = {
    access_token,
    device_id: '70:ee:50:39:f6:7e'
};

const params2 = new URLSearchParams();

Object.keys(data2).forEach((key) => params2.append(key, data2[key]));


fetch(geturl, {
    method: 'post',
    body: params2,
    headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    }
}).then((res) => {
    if(!res.ok) {
        console.log("Error request");
        access_token = "";
        refresh_token = "";
    } else {
        console.log("Success request");
    }

    console.log(res.ok);
    console.log(res.status);
    console.log(res.statusText);
    console.log(res.headers.raw());
    console.log(res.headers.get('content-type'));

    return res.json();
}).then((data) => console.log(JSON.stringify(data, null, 2)))
.catch((err) => {

});