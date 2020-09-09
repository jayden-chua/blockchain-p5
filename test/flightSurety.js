var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
        try {
            await config.flightSuretyApp.registerAirline(accounts[2], { from: config.firstAirline });
        } catch (e) {}
        let result = await config.flightSuretyData.isAirlineRegisteredApprovedAndFunded.call(accounts[2]);
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
    });

    it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
        let newAirline = accounts[3];
        let fundAirlineValue = web3.utils.toWei('10', 'ether');
        await config.flightSuretyApp.fundAirline({ from: config.owner, value: fundAirlineValue });
        await config.flightSuretyApp.registerAirline(newAirline, { from: config.owner });
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
        assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");
    });

    it('(owner) can get total airline count', async () => {
        await config.flightSuretyApp.registerAirline(accounts[4], { from: config.owner });
        let result = await config.flightSuretyData.getAirlinesCount.call({ from: config.owner });
        assert.equal(result, 3, "Airline owner should be able to get total airline registered");
    });

    it('(airline) cannot register an Airline using registerAirline() on airlines that are already registered', async () => {
        try { 
            // Expecting this to revert since account 4 has already previously been registered
            await config.flightSuretyApp.registerAirline(accounts[4], { from: config.firstAirline }); 
        } catch(e) {}
        let result = await config.flightSuretyData.getAirlinesCount.call({ from: config.owner });
        assert.equal(result, 3, "Airline should not have been registered again");
    });

    it('(airline) that is funded and approved can register a Flight using registerFlight()', async () => {
        let flight = 'MX1234';
        // registerFlight() expects depature time in uint256 (integer)
        // Date.now() provides dates in miliseconds
        // we will got with second accuracy
        let departure = Math.round(Date.now() / 1000);
        await config.flightSuretyApp.registerFlight(flight, departure, { from: config.owner });
        let result = await config.flightSuretyApp.isFlightRegistered.call(flight, departure, { from: config.owner });
        assert.equal(result, true, 'Flight should have been registered')
    });

    it('(airline) that is funded and approved cannot register the same Flight repeatedly using registerFlight()', async () => {
        let revertted = false;
        let flight = 'MX1234';
        // registerFlight() expects depature time in uint256 (integer)
        // Date.now() provides dates in miliseconds
        // we will got with second accuracy
        let departure = Math.round(Date.now() / 1000);
        await config.flightSuretyApp.registerFlight(flight, departure, { from: config.owner });
        
        try {
            await config.flightSuretyApp.registerFlight(flight, departure, { from: config.owner });
        } catch(e) {
            revertted = true;
        }
        assert.equal(revertted, true, 'Same flight cannot be registered repeatedly');
    });

});
