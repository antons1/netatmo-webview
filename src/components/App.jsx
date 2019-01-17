import React, { Component } from 'react';

import { callNetatmo } from '../utilities/index';

class App extends Component {
    constructor(props) {
        super(props);

        this.onChangePw = this.onChangePw.bind(this);
        this.onChangeUn = this.onChangeUn.bind(this);
        this.submitForm = this.submitForm.bind(this);
        this.getStationData = this.getStationData.bind(this);

        this.state = {
            username: "",
            password: "",
            client_id: "5c405a3fd6e33f11008b4e8e",
            client_secret: "P77Cmy7ZkjU9LRtf1mDuqfOsx2Hq6vbGt",
            scope: "read_station",
            access_token: "",
            refresh_token: "",
            device_id: "70:ee:50:39:f6:7e",
            access_token_time: 0,
            access_token_timeout: 0,
            error: "",
            data: {},
            notice: "",
            errObj: {}
        }
    }

    onChangePw(event) {this.setState({password: event.target.value});}
    onChangeUn(event) {this.setState({username: event.target.value});}
    submitForm(event) {
        const { username, password, access_token, refresh_token, access_token_time, access_token_timeout } = this.state;
        if (username === "" && password === "" && access_token === "") {
            this.setState({ error: "You need to specify a username and password "});
            return;
        }

        if (access_token === "" && refresh_token === "") {
            // Log in with username and password
            this.setState({ notice: "Logging in with username and password" })
            callNetatmo("https://api.netatmo.com/oauth2/token", {
                username,
                password,
                client_id: this.state.client_id,
                client_secret: this.state.client_secret,
                grant_type: "password",
                scope: this.state.scope
            }, true).then((data) => this.setState({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                access_token_time: (new Date().getTime()),
                access_token_timeout: data.expires_in,
                data: data
            }))
            .catch((err) => this.setState({error: JSON.stringify(err, null, 2), errObj: err}));
        } else if(access_token !== "" && ((new Date().getTime()) - (access_token_time + access_token_timeout)) < 0) {
            // Do nothing, we are logged in
            this.setState({ notice: "You already have an access token that is valid. No need to refresh" });
        } else if(refresh_token !== "") {
            // Refresh access token
            this.setState({ notice: "Refreshing access token" })
            callNetatmo("https://api.netatmo.com/oauth2/token", {
                grant_type: "refresh_token",
                client_id: this.state.client_id,
                client_secret: this.state.client_secret,
                refresh_token: this.state.refresh_token
            }).then((data) => this.setState({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                access_token_time: (new Date().getTime()),
                access_token_timeout: data.expires_in,
                data: data
            }))
            .catch((err) => this.setState({error: JSON.stringify(err, null, 2), errObj: err}));
        }
    }

    getStationData(event) {
        const { access_token, device_id } = this.state;

        if(access_token === "") {
            this.setState({
                error: "You are not logged in"
            });
            return;
        }

        callNetatmo("https://api.netatmo.com/api/getstationsdata", {
            access_token,
            device_id
        }).then((data) => this.setState({ data: data, notice: "Got station data" }))
        .catch((err) => this.setState({ error: JSON.stringify(err, null, 2), errObj: err }));
    }

    render() {
        return (
            <div>
                <div>Hello world!</div>

                <form>
                    <input type="username" name="username" value={this.username} onChange={this.onChangeUn} /><br />
                    <input type="password" name="password" value={this.password} onChange={this.onChangePw} /><br />
                    <button type="button" onClick={this.submitForm}>Logg inn!</button>
                </form>
                <hr />
                <button type="button" onClick={this.getStationData}>Hent data!</button>
                <hr />
                <ObjectPrint title="App state" obj={this.state} />
                <hr />
                <ObjectPrint title="Received data" obj={this.state.data} />
                <hr />
                <ObjectPrint title="Error" obj={this.state.errObj} />
            </div>
        )
    }
} 

export default App;

const ObjectPrint = ({ title, obj }) =>
    <div>
        <h3>{title}</h3>
        {Object.keys(obj).map((key, ind) => <div key={ind}><em>{key}</em>: {typeof obj[key] === 'object' ? <ObjectData data={obj[key]} /> : <StringData data={obj[key]} />}</div>)}
    </div>

const StringData = ({ data }) => <span>{data.toString()}</span>;

const ObjectData = ({ data }) => <pre>{JSON.stringify(data, null, 2)}</pre>