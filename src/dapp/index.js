
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    let result = null;
    const fakeDate = 1599617187; // TODO: Change this to be populated from input field
    const STATUS_CODES = {
        0: 'Unknown',
        10: 'On Time',
        20: 'Late (Airline)',
        30: 'Late (Weather)',
        40: 'Late (Technical)',
        50: 'Late (Other)'
    };

    let contract = new Contract('localhost', () => {
        populateFlightOptions(contract.flights);

        contract.registerAirlines((error, result) => {
            if (error) {
                console.log(error);
            } else {
                console.log(result);
            }
        });

        contract.isOperational((error, result) => {
            if (error) console.log(error);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
            DOM.elid('platform-status').innerHTML = result;
        });

        contract.getAirlinesCount((error, result) => {
            if (error) console.log(error);
            DOM.elid('airline-count').innerHTML = result;
        });

        contract.flightSuretyData.events.AirlineRegistered()
        .on('data', (err, res) => {
            if (err) { console.log(err); }
            contract.getAirlinesCount((error, result) => {
                if (error) console.log(error);
                DOM.elid('airline-count').innerHTML = result;
            });
        });

        contract.flightSuretyApp.events.FlightStatusInfo((error, result) => {
            if (result.returnValues.status) {
                display('Flight Status', 'Latest Flight Status', [{ label: 'Flight status', error: error, value: result.returnValues.flight + ' ' + STATUS_CODES[result.returnValues.status] }]);
            }
        });

        contract.flightSuretyData.events.PassengerRefunded((error, result) => {
            display('Passenger Insurance', 'Latest Passenger Insurance Status', [{ label: 'Policy Amount Refunded', error: error, value: result.returnValues.refundAmount }]);
        });

        // User-submitted transaction
        DOM.elid('fund-airline-1').addEventListener('click', () => {
            contract.fundAirline(contract.owner, (error, result) => {
                display('Fund Airlines', 'Trigger fund airline', [{ label: 'Funded Airline Address', error: error, value: result }]);
                if (result) {
                    DOM.elid('fund-airline-1').remove();
                }
            });
        })

        DOM.elid('register-airline-2').addEventListener('click', () => {
            contract.registerAirline(contract.airlines[0], function (error, result) {
                display('Register Airline 2', 'Trigger register airline', [{ label: 'Registered Airline Address', error: error, value: result }]);
                if (result) {
                    DOM.elid('register-airline-2').remove();
                }
            });
        })

        DOM.elid('register-airline-3').addEventListener('click', () => {
            contract.registerAirline(contract.airlines[1], (error, result) => {
                display('Register Airline 3', 'Trigger register airline', [{ label: 'Registered Airline Address', error: error, value: result }]);
                if (result) {
                    DOM.elid('register-airline-3').remove();
                }
            });
        });

        DOM.elid('submit-flight-registration').addEventListener('click', () => {
            let flight = DOM.elid('register-flight-number').value;
            let departure = fakeDate;
            contract.registerFlight(contract.owner, flight, departure, (error, result) => {
                display('Flight', 'Trigger Flight Registration', [{ label: 'Flight Registration Completed', error: error, value: result }]);
            });
        });

        DOM.elid('submit-insurance-purchase').addEventListener('click', async () => {
            let flight = DOM.elid('buy-insurance-flightno').value;
            let premium = DOM.elid('buy-insurance-premium').value;
            let departure = fakeDate;
            console.log('Passenger balance before purchase: ' + await contract.web3.eth.getBalance(contract.passengers[0]));
            await contract.buyInsurance(flight, departure, premium, (error, result) => {
                display('Passenger', 'Trigger Insurance Purchase', [{ label: 'Insurance Purchase Completed', error: error, value: result }]);
            });
            console.log('Passenger balance after purchase: ' + await contract.web3.eth.getBalance(contract.passengers[0]));
        });

        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            let departure = fakeDate;
            // Write transaction
            contract.fetchFlightStatus(flight, departure, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result} ]);
            });
        })

        DOM.elid('get-balance').addEventListener('click', () => {
            contract.getPassengerBalance((error, result) => {
                display('Passenger', 'Latest Balance', [{ label: 'Passenger 0', error: error, value: result }]);
            });
        });

        DOM.elid('passenger-withdraw').addEventListener('click', async () => {
            await console.log('Passenger balance before withdrawal: ' + await contract.web3.eth.getBalance(contract.passengers[0]));
            await contract.passengerWithdraw((error, result) => {
                
            });
            await console.log('Passenger balance after withdrawal: ' + await contract.web3.eth.getBalance(contract.passengers[0]));
        })

    });


})();

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    displayDiv.innerHTML = '';
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}

function populateFlightOptions(flights) {
    flights.forEach(flight => {
        console.log(flight);
    });
}