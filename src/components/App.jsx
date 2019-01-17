import React, { Component } from 'react';

import { callNetatmo } from '../utilities/index';
import { db } from '../utilities/firebase';

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
            error: "",
            data: {},
            notice: "",
            errObj: {}
        }
    }

    componentDidMount() {
        db.ref('settings').once('value').then((data) => {
            this.setState(data.val());
        })
    }

    onChangePw(event) {this.setState({password: event.target.value});}
    onChangeUn(event) {this.setState({username: event.target.value});}
    submitForm(event) {
        db.ref('settings').once('value').then((data) => {
            const { client_id, client_secret, device_id, scope } = data.val();
            db.ref('access').once('value').then((data) => {
                const { access_token, refresh_token, access_token_time, access_token_timeout } = data.val() || {};
                const { username, password } = this.state;
            
                if (!username && !password && !access_token) {
                    this.setState({ error: "You need to specify a username and password "});
                    return;
                }

                if (!access_token && !refresh_token) {
                    // Log in with username and password
                    this.setState({ notice: "Logging in with username and password" })
                    callNetatmo("https://api.netatmo.com/oauth2/token", {
                        username,
                        password,
                        client_id: client_id,
                        client_secret: client_secret,
                        grant_type: "password",
                        scope: scope
                    }, true).then((data) => db.ref('access').set({
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        access_token_time: (new Date().getTime()),
                        access_token_timeout: data.expires_in
                    }))
                    .catch((err) => this.setState({error: JSON.stringify(err, null, 2), errObj: err}));
                } else if(access_token !== "" && ((new Date().getTime()) - (access_token_time + access_token_timeout)) < 0) {
                    // Do nothing, we are logged in
                    this.setState({ notice: "You already have an access token that is valid. No need to refresh" });
                } else if(refresh_token) {
                    // Refresh access token
                    this.setState({ notice: "Refreshing access token" })
                    callNetatmo("https://api.netatmo.com/oauth2/token", {
                        grant_type: "refresh_token",
                        client_id: client_id,
                        client_secret: client_secret,
                        refresh_token: refresh_token
                    }).then((data) => db.ref('access').set({
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        access_token_time: (new Date().getTime()),
                        access_token_timeout: data.expires_in,
                    }))
                    .catch((err) => this.setState({error: JSON.stringify(err, null, 2), errObj: err}));
                }
            })
        })
    }

    getStationData(event) {
        db.ref('settings').once('value').then((data) => {
            const { device_id } = data.val() || {};
            db.ref('access').once('value').then((data) => {
                const { access_token } = data.val() || {};

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
            });
        });
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