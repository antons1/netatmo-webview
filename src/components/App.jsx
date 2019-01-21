import React, { Component } from 'react';

import { loadData as loadNetatmoData, usernameAndPasswordAuthentication as netatmoAuthenticate } from '../utilities/netatmo';

class App extends Component {
    constructor(props) {
        super(props);

        this.onChangePw = this.onChangePw.bind(this);
        this.onChangeUn = this.onChangeUn.bind(this);
        this.loadData = this.loadData.bind(this);
        this.logIn = this.logIn.bind(this);

        this.state = {
            username: "",
            password: "",
            error: "",
            data: {},
            notice: "",
            errObj: {},
            loginRequired: false,
            loginWithoutUsernameOrPasswordAttempted: false
        }
    }

    onChangePw(event) {this.setState({password: event.target.value});}
    onChangeUn(event) {this.setState({username: event.target.value});}

    loadData() {
        loadNetatmoData()
        .then((data) => this.setState({ notice: data.message, data: data.data }))
        .catch((err) => this.setState({ error: err.message, errorObj: err.data }));
    }

    logIn() {
        const { username, password } = this.state;
        if(!username || !password) {
            this.setState({
                error: 'Username and password must be entered to authenticate',
                loginWithoutUsernameOrPasswordAttempted: true
            });
            return;
        }

        netatmoAuthenticate(username, password)
        .then((result) => this.setState({ notice: result.message, data: result.data, loginWithoutUsernameOrPasswordAttempted: false, loginRequired: false}))
        .catch((error) => this.setState({ error: error.message, errorObj: error.data }));
    }

    render() {
        return (
            <div>
                <div>Hello world!</div>

                {this.state.loginRequired ? <form>
                    <input type="username" name="username" value={this.username} onChange={this.onChangeUn} /><br />
                    <input type="password" name="password" value={this.password} onChange={this.onChangePw} /><br />
                    <button type="button" onClick={this.logIn}>Logg inn!</button>
                </form> : null}
                <hr />
                <button type="button" onClick={this.loadData}>Hent data!</button>
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

const StringData = ({ data }) => <span>{(data === "" || data) && data.toString ? data.toString() : 'Could not stringify data'}</span>;

const ObjectData = ({ data }) => <pre>{JSON.stringify(data, null, 2)}</pre>