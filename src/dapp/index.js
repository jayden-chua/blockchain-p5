
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            if (error) console.log(error);
            // display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
            DOM.elid('platform-status').innerHTML = result;
        });

        contract.getAirlinesCount((error, result) => {
            if (error) console.log(error);
            DOM.elid('airline-count').innerHTML = result;
        });

        contract.events.AirlineRegistered((error, event) => { console.log(event) });


        // User-submitted transaction
        DOM.elid('fund-airline-1').addEventListener('click', () => {

            // Write transaction
            contract.fundAirline((error, result) => {
                display('Fund Airlines', 'Trigger fund airline', [{ label: 'Funded Airline Address', error: error, value: result }]);

                if (result) {
                    DOM.elid('fund-airline-1').remove();
                }
            });
        })

        DOM.elid('register-airline-2').addEventListener('click', () => {

            // Write transaction
            contract.registerAirline(contract.airlines[1], (error, result) => {
                display('Register Airline 2', 'Trigger register airline', [{ label: 'Registered Airline Address', error: error, value: JSON.stringify(result) }]);

                if (result) {
                    contract.getAirlinesCount((error, result) => {
                        if (error) console.log(error);
                        console.log(result);
                        DOM.elid('airline-count').innerHTML = result;
                    });

                    DOM.elid('register-airline-2').remove();
                }
            });
        })

        DOM.elid('register-airline').addEventListener('click', () => {
            let airlineAddress = DOM.elid('airline-address').value;
            // Write transaction
            contract.registerAirline(airlineAddress, (error, result) => {
                display('Register Airlines', 'Trigger register airline', [{ label: 'Register Airlines', error: error, value: result }]);
            });
        })

        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
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







