import React, { Component, Fragment } from 'react';

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
        //this.fetcher = setTimeout(600000, this.loadData);
    }

    componentWillUnmount() {
        this.dbRef.off('child_added', this.firebaseDataUpdated);
        //firebaseclearTimeout(this.fetcher);
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
            <div className="vetatmo">
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
        <SensorTitle name={stationName} reachable={reachable} symbol="&#127969;" size={0} />
        <Inside {...inside} reachable={reachable} />
        <Outside {...outside} />
    </div>;

const Inside = ({ name, co2, humidity, noise, pressure, temperature, reachable }) =>
    <div>
        <SensorTitle name={name} reachable={reachable} symbol="&#128022;" size={1} />
        <SensorData name="Temperature" value={temperature} unit="&#176;C" />
        <SensorData name="Humidity" value={humidity} unit="%" />
        <SensorData name="Noise" value={noise} unit="dB" />
        <SensorData name="Pressure" value={pressure} unit="hpa" />
        <SensorData name="CO2" value={co2} unit="ppm" />
    </div>;

const Outside = ({ name, temperature, humidity, minTemperature, maxTemperature, minTemperatureTime, maxTemperatureTime, reachable }) =>
    <div>
        <SensorTitle name={name} reachable={reachable} symbol="&#128016;" size={1} />
        <SensorData name="Temperature" value={temperature} unit="&#176;C" />
        <SensorData name="Humidity" value={humidity} unit="%" />
    </div>;

const StatusLight = ({ reachable }) => <span className={`status-light ${reachable ? 'status-light--reachable' : 'status-light--unreachable'}`}></span>

const SensorTitle = ({ name, reachable, symbol, size }) =>
    <div className="sensor-title">
        {size === 0 ? <h2 className="sensor-title__name">{name} {symbol}</h2> : null}
        {size === 1 ? <h4 className="sensor-title__name">{name} {symbol}</h4> : null}
        <StatusLight reachable={reachable} />
    </div>

const SensorData = ({ name, unit, value, level, trend}) =>
    <div className="sensor-data">
        <h5 className="sensor-data__name">{name}</h5>
        <div className="sensor-data__value-wrapper">
            <div className="sensor-data__value">{value}</div>
            <div className="sensor-data__unit">{unit}</div>
        </div>
        {trend ? <div className="sensor-data__trend">{trend}</div> : null}
    </div>