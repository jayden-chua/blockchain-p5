import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            let self = this;

            this.owner = accts[0];

            let counter = 1;

            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, departure, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fetchFlightStatus(self.owner, flight, departure)
            .send({ from: self.owner}, callback);
    }

    getAirlinesCount(callback) {
        let self = this;
        self.flightSuretyData.methods
            .getAirlinesCount()
            .call({from: self.owner}, callback);
    }

    isAirlineRegistered(airline, callback) {
        let self = this;
        self.flightSuretyData.methods
            .isAirlineRegistered(airline)
            .call({ from: self.owner }, callback);
    }

    registerAirline(airlineAddress, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerAirline(airlineAddress)
            .send({ from: self.owner, gas: 500000, gasPrice: 100000000000 }, callback);
    }

    registerFlight(flight, departureTimestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerFlight(flight, departureTimestamp)
            .send({ from: self.owner, gas: 500000, gasPrice: 100000000000 }, callback);
    }

    isFlightRegistered(flight, departureTimestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isFlightRegistered(flight, departureTimestamp)
            .call({ from: self.owner }, callback);
    }

    buyInsurance(flight, departureTimestamp, premium, callback) {
        let self = this;
        premium = self.web3.utils.toWei(premium, 'ether');
        self.flightSuretyData.methods
            .buy(self.owner, flight, departureTimestamp)
            .send({ from: self.passengers[0], gas: 500000, gasPrice: 100000000000, value: premium }, callback); //TODO: make passenger dynamic
    }

    fundAirline(callback) {
        let self = this;
        let fundAirlineValue = self.web3.utils.toWei('10', 'ether');
        self.flightSuretyApp.methods
            .fundAirline()
            .send({ from: self.owner, value: fundAirlineValue}, callback);
    }

    getPassengerBalance(callback) {
        let self = this;
        self.flightSuretyData.methods
            .getPassengerBalance()
            .call({from: self.passengers[0]}, callback);
    }
}
