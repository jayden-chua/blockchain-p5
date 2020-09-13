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
        this.flights = {
            0: {
                code: "AX1111",
                departureTime: Math.floor(Date.now() / 1000)
            },
            1: {
                code: "BX2222",
                departureTime: Math.floor(Date.now() / 1000)
            },
            2: {
                code: "CX3333",
                departureTime: Math.floor(Date.now() / 1000)
            }
        };
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];

            let counter = 1;
            let totalAirlines = 4;

            // Fund the first airline            
            while (this.airlines.length < totalAirlines) {
                this.airlines.push(accts[counter++]);
            }

            // Will only mostly use the first passenger for this dapp
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

    fetchFlightStatus(airline, flight, departure, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fetchFlightStatus(airline, flight, departure)
            .send({ from: self.owner }, callback);
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

    registerFlight(airline, flight, departureTimestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerFlight(flight, departureTimestamp)
            .send({ from: airline, gas: 500000, gasPrice: 100000000000 }, callback);
    }

    isFlightRegistered(flight, departureTimestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isFlightRegistered(flight, departureTimestamp)
            .call({ from: self.owner }, callback);
    }

    buyInsurance(passenger, airline, flight, departureTimestamp, premium, callback) {
        let self = this;
        premium = self.web3.utils.toWei(premium, 'ether');
        self.flightSuretyData.methods
            .buy(airline, flight, departureTimestamp)
            .send({ from: passenger, gas: 500000, gasPrice: 100000000000, value: premium }, callback);
    }

    fundAirline(account, callback) {
        let self = this;
        let fundAirlineValue = self.web3.utils.toWei('10', 'ether');
        self.flightSuretyApp.methods
            .fundAirline()
            .send({ from: account, value: fundAirlineValue}, callback);
    }

    getPassengerBalance(callback) {
        let self = this;
        self.flightSuretyData.methods
            .getPassengerBalance()
            .call({from: self.passengers[0]}, callback);
    }

    passengerWithdraw(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .passengerWithdraw()
            .send({ from: self.passengers[0] }, callback);
    }
}
