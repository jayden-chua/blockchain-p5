import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {
    let result = null;

    const STATUS_CODES = {
        0: 'Unknown',
        10: 'On Time',
        20: 'Late (Airline)',
        30: 'Late (Weather)',
        40: 'Late (Technical)',
        50: 'Late (Other)'
    };

    const flights = {
        '0': {
            code: "AX1111",
            departureTime: Math.floor(1599897252230 / 1000)
        },
        '1': {
            code: "BX2222",
            departureTime: Math.floor(1599897252230 / 1000)
        },
        '2': {
            code: "CX3333",
            departureTime: Math.floor(1599897252230 / 1000)
        }
    };

    let contract = new Contract('localhost', () => {
        initializeAirlines(contract, flights);
        createFlightSelectMenu(flights);

        contract.isOperational((error, result) => {
            display([{ label: 'Operational Status', error: error, value: result}]);
        });

        contract.getAirlinesCount((error, result) => {
            display([{ label: 'Total No. of Registered Airlines', error: error, value: result }]);
        });

        contract.flightSuretyData.events.InsurancePurchased((error, result) => {
            if (result.returnValues) {
                let response = result.returnValues;
                display([{ label: 'Insurance Purchased', error: error, value: `Airline: ${response.airline} | Flight: ${response.flight} | Departure: ${response.timestamp} | FlightKey: ${response.flightKey}` }]);
            }
        });

        contract.flightSuretyApp.events.FlightStatusInfo((error, result) => {
            if (result.returnValues.status) {
                display([{ label: 'Flight status', error: error, value: result.returnValues.flight + ' ' + STATUS_CODES[result.returnValues.status] }]);
            }
        });

        contract.flightSuretyData.events.PassengerRefunded((error, result) => {
            display([{ label: 'Policy Amount Refunded', error: error, value: result.returnValues.refundAmount }]);
        });

        DOM.elid('submit-oracle').addEventListener('click', () => {
            let selectedFlight = DOM.elid('query-flights');
            
            let airline = contract.airlines[selectedFlight.selectedIndex];
            let flight = selectedFlight.options[selectedFlight.selectedIndex].getAttribute('data-flight');
            let departure = selectedFlight.options[selectedFlight.selectedIndex].getAttribute('data-departure');
            
            contract.fetchFlightStatus(airline, flight, departure, (error, result) => {
                display([{ label: 'Fetch Flight Triggered', error: error, value: result} ]);
            });
        })

        DOM.elid('get-balance').addEventListener('click', () => {
            contract.getPassengerBalance((error, result) => {
                display([{ label: 'Passenger Insurance Available for Withdrawal ', error: error, value: result }]);
            });
        });

        DOM.elid('passenger-withdraw').addEventListener('click', async () => {
            display([{ label: 'Passenger wallet before withdrawal', error: '', value: await contract.web3.eth.getBalance(contract.passengers[0]) }]);
            contract.passengerWithdraw(async (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    display([{ label: 'Passenger wallet after withdrawal', error: error, value: await contract.web3.eth.getBalance(contract.passengers[0]) }]);
                }
            });
             
        })

        

        
        DOM.elid('purchase-insurance').addEventListener('click', function () {
            let selectFlight = DOM.elid('select-flights');

            let airline = contract.airlines[selectFlight.selectedIndex];
            let flight = selectFlight.options[selectFlight.selectedIndex].getAttribute('data-flight');
            let departure = selectFlight.options[selectFlight.selectedIndex].getAttribute('data-departure');
            let premium = DOM.elid('premium-value').value;
            console.log(contract.passengers[0], airline, flight, departure, premium);
            
            contract.buyInsurance(contract.passengers[0], airline, flight, departure, premium, (error, result) => {
                if (error) console.log(error);
                display([{ label: 'Insurance Purchase Triggered', error: error, value: result }]);
            });
        });
            
        

    });


})();

function display(results) {
    let displayDiv = DOM.elid("display-wrapper");
    results.map((result) => {
        let row = DOM.div({className:'row'});
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        displayDiv.appendChild(row);    
    });
}

/**
 * Simple demo app initialization for the airlines
 * This should be only done once to prevent funding of first airline multiple times
 */
async function initializeAirlines(contract, flights)
{
    // if (localStorage.getItem('FlightSuretyInitiated')) {
    //     return;
    // }
    localStorage.setItem('FlightSuretyInitiated', true);
    await contract.fundAirline(contract.owner, async (err, res) => {
        if (err) { 
            console.log(err)
        } else {
            let airlines = [0, 1, 2];

            await airlines.forEach(async airline => {
                await contract.registerAirline(contract.airlines[airline], async (err, res) => {
                    if (err) {
                        console.log('=== ERROR in REGISTER AIRLINE ===');
                        console.log(err);
                    } else {
                        await contract.fundAirline(contract.airlines[airline], async (err, res) => {
                            if (err) {
                                console.log('=== ERROR in FUND AIRLINE ===');
                                console.log(err);
                            } else {
                                await contract.registerFlight(contract.airlines[airline], flights[airline].code, flights[airline].departureTime, (err, res) => {
                                    if (err) {
                                        console.log('=== ERROR in FLIGHT REGISTRATION');
                                        console.log(err);
                                    }
                                });
                            }
                        })
                    }
                });
            });    
        }
    });

    
}

function createFlightSelectMenu(flights)
{
    let flightDropdown = DOM.elclass('dd-flight');
    let option;
    console.log(flightDropdown);
    for (const [index, flight] of Object.entries(flights)) {
        for (const [index, selectBox] of Object.entries(flightDropdown)) {
            option = document.createElement('option');
            option.text = flight.code;
            option.value = index;
            option.setAttribute('data-flight', flight.code);
            option.setAttribute('data-departure', flight.departureTime); 
            selectBox.appendChild(option);
        }
    }
}