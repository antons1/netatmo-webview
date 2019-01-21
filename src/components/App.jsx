import React, { Component } from 'react';

import { db } from '../utilities/firebase';
import { loadData as loadNetatmoData, usernameAndPasswordAuthentication as netatmoAuthenticate } from '../utilities/netatmo';

class App extends Component {
    constructor(props) {
        super(props);

        this.onChangePw = this.onChangePw.bind(this);
        this.onChangeUn = this.onChangeUn.bind(this);
        this.loadData = this.loadData.bind(this);
        this.logIn = this.logIn.bind(this);
        this.firebaseDataUpdated = this.firebaseDataUpdated.bind(this);

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

        this.dbRef = null;
        this.fetcher = null;
    }

    componentDidMount() {
        const date = new Date();
        const fbPath = `data/${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
        this.dbRef = db.ref(fbPath);
        this.dbRef.limitToLast(1).on('child_added', this.firebaseDataUpdated);

        //this.loadData();
        this.fetcher = setTimeout(600000, this.loadData);
    }

    componentWillUnmount() {
        this.dbRef.off('child_added', this.firebaseDataUpdated);
        clearTimeout(this.fetcher);
    }

    firebaseDataUpdated(newData, prevData) {
        this.setState({ data: newData.val() });
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
                {this.state.loginRequired ? <form>
                    <input type="username" name="username" value={this.username} onChange={this.onChangeUn} /><br />
                    <input type="password" name="password" value={this.password} onChange={this.onChangePw} /><br />
                    <button type="button" onClick={this.logIn}>Logg inn!</button>
                </form> : null}
                <Station {...this.state.data} />
            </div>
        )
    }
} 

export default App;

const Station = ({ stationName, reachable, position, inside, outside }) =>
    <div>
        <h3>{stationName}</h3>
        <Inside {...inside} />
    </div>;

const Inside = ({ name, co2, humidity, noise, pressure, temperature }) =>
    <div>
        <h4>{name}</h4>
        Co2: {co2}<br />
        Humidity: {humidity}
    </div>;