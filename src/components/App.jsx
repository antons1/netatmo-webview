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
        this.dateUpdated = this.dateUpdated.bind(this);

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

        this.checkNewDayRef = null;
        this.checkNewMonthRef = null;
        this.checkNewYearRef = null;
        this.dbRef = null;
        this.fetcher = null;
    }

    componentDidMount() {
        const date = new Date();
        const fbPath = `data/${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
        this.dbRef = db.ref(fbPath);
        this.dbRef.limitToLast(1).on('child_added', this.firebaseDataUpdated);

        this.checkNewDayRef = db.ref(`data/${date.getFullYear()}/${date.getMonth()+1}`);
        this.checkNewMonthRef = db.ref(`data/${date.getFullYear()}`);
        this.checkNewYearRef = db.ref(`data`);

        this.checkNewDayRef.limitToLast(1).on('child_added', this.dateUpdated);
        this.checkNewMonthRef.limitToLast(1).on('child_added', this.dateUpdated);
        this.checkNewYearRef.limitToLast(1).on('child_added', this.dateUpdated);
    }

    componentWillUnmount() {
        this.dbRef.off('child_added', this.firebaseDataUpdated);
        this.checkNewDayRef.off(this.dateUpdated);
        this.checkNewMonthRef.off(this.dateUpdated);
        this.checkNewYearRef.off(this.dateUpdated);
    }

    firebaseDataUpdated(newData, prevData) {
        this.setState({ data: newData.val() });
    }

    dateUpdated(data) {
        this.dbRef.off('child_added', this.firebaseDataUpdated);
        const date = new Date();
        const fbPath = `data/${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
        this.dbRef = db.ref(fbPath);
        this.dbRef.limitToLast(1).on('child_added', this.firebaseDataUpdated);
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
        <SensorData name="Temperature" value={temperature} unit="&#176;C" levelDefinitions={[
            { level: 0, low: null, high: 10 },
            { level: 1, low: 16, high: 19 },
            { level: 2, low: 20, high: 23 },
            { level: 3, low: 24, high: 29 },
            { level: 4, low: 30, high: null },
        ]}/>
        <SensorData name="Humidity" value={humidity} unit="%" levelDefinitions={[
            { level: 0, low: null, high: 10 },
            { level: 2, low: 11, high: 89 },
            { level: 4, low: 90, high: null },
        ]}/>
        <SensorData name="Noise" value={noise} unit="dB" levelDefinitions={[
            { level: 2, low: null, high: 84 },
            { level: 3, low: 85, high: 109 },
            { level: 4, low: 110, high: null },
        ]}/>
        <SensorData name="Pressure" value={pressure} unit="hpa" levelDefinitions={[
            { level: 0, low: null, high: 800 },
            { level: 1, low: 801, high: 950 },
            { level: 2, low: 951, high: 1050 },
            { level: 3, low: 1051, high: 1150 },
            { level: 4, low: 1151, high: null },
        ]}/>
        <SensorData name="CO2" value={co2} unit="ppm" levelDefinitions={[
            { level: 0, low: null, high: 100 },
            { level: 1, low: 101, high: 200 },
            { level: 2, low: 201, high: 800 },
            { level: 3, low: 801, high: 1500 },
            { level: 4, low: 1501, high: null },
        ]}/>
    </div>;

const Outside = ({ name, temperature, humidity, minTemperature, maxTemperature, minTemperatureTime, maxTemperatureTime, reachable }) =>
    <div>
        <SensorTitle name={name} reachable={reachable} symbol="&#128016;" size={1} />
        <SensorData name="Temperature" value={temperature} unit="&#176;C" levelDefinitions={[
            { level: 0, low: null, high: -6 },
            { level: 1, low: -5, high: 9 },
            { level: 2, low: 10, high: 20 },
            { level: 3, low: 21, high: 30 },
            { level: 4, low: 31, high: null },
        ]}/>
        <SensorData name="Humidity" value={humidity} unit="%" levelDefinitions={[
            { level: 0, low: null, high: 10 },
            { level: 2, low: 11, high: 89 },
            { level: 4, low: 90, high: null },
        ]}/>
    </div>;

const StatusLight = ({ reachable }) => <span className={`status-light ${reachable ? 'status-light--reachable' : 'status-light--unreachable'}`}></span>

const SensorTitle = ({ name, reachable, symbol, size }) =>
    <div className="sensor-title">
        {size === 0 ? <h2 className="sensor-title__name">{name} {symbol}</h2> : null}
        {size === 1 ? <h4 className="sensor-title__name">{name} {symbol}</h4> : null}
        <StatusLight reachable={reachable} />
    </div>

/* Level:
 *  0 - Very low
 *  1 - Low
 *  2 - Normal
 *  3 - High
 *  4 - Very High
*/
const SensorData = ({ name, unit, value, trend, levelDefinitions}) => {
    const level = levelDefinitions ? levelDefinitions.find((definition) => (definition.low === null || value >= definition.low) && (definition.high === null || value <= definition.high)) : { level: 2 };
    
    return (
        <div className="sensor-data">
            <h5 className="sensor-data__name">{name}</h5>
            <div className="sensor-data__value-wrapper">
                <div className={"sensor-data__value sensor-data__value--" + ((level) => {
                    switch(level ? level.level : 2) {
                        case 0: return "very-low";
                        case 1: return "low";
                        default:
                        case 2: return "normal";
                        case 3: return "high";
                        case 4: return "very-high";
                    }
                })(level)}>{value}</div>
                <div className="sensor-data__unit">{unit}</div>
            </div>
            {trend ? <div className="sensor-data__trend">{trend}</div> : null}
        </div>
    );
}
