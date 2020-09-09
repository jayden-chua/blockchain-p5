pragma solidity >0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;
    using SafeMath for uint;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Minimum of Airlines before consensus required
    uint256 private minAirlineConsensusThreshold = 4;
    uint256 private minPercentageVotesRequired = 50;
    uint256 private minInitialFund = 10000000000000000000;

    address private contractOwner;
    bool private operational = true;

    struct Votes{
        uint voteCount;
        mapping(address => bool) voters;
    }

    struct Airline {
        bool exists;
        bool isApproved;
        bool isFunded;
        uint256 registeredNumber;
        Votes votes;
    }

    struct Flight {
        bool exists;
        uint8 statusCode;
        string name;
        uint256 departureTimestamp;
        address airline;
    }

    struct InsurancePolicy {
        address insuredAddress;
        uint256 insuredValue;
        bytes32 insuredFlight;
        bool isRefunded;
    }

    struct Passenger {
        bool exists;
        address passengerAddress;
        uint256 balance;
    }

    uint256 private airlinesCount;
    mapping(address => Airline) private airlines;
    mapping(address => bool) private authorizedContracts;
    mapping(bytes32 => Flight) private flights;
    mapping(bytes32 => InsurancePolicy[]) private insurances;
    mapping(address => Passenger) private passengerBalances;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AirlineRegistered(address newAirline);
    event AirlineFunded(address airline);
    event PassengerRefunded(address passenger, uint256 refundAmount);
    event PassengerPaid(address passenger, uint256 amount);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor() public
    {
        contractOwner = msg.sender;
        authorizedContracts[contractOwner] = true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the only authorized contracts to be function caller
    */
    modifier requireAuthorizedContracts
    {
        require(authorizedContracts[msg.sender] == true, "Caller is not authorized");
        _;
    }

    /**
    * @dev Modifier that requires airline isApproved flag to be false
    */
    modifier requireAirlineApproval(address airline)
    {
        require(airlines[airline].isApproved == false, "Airline does not need approval");
        _;
    }

    /**
    * @dev Modifier that requires total number of airlines to be greater that the minimum threshold
    */
    modifier requireAirlineApprovalConditions(address airline)
    {
        require(airlines[airline].registeredNumber >= minAirlineConsensusThreshold, "Airline does not need approval via consensus");
        _;
    }

    modifier requireAirlineExists(address airline) {
        require(airlines[airline].exists, "Airline does not exists.");
        _;
    }

    modifier requireAirlineApproved(address airline) {
        require(airlines[airline].isApproved, "Airline hasn't been approved yet.");
        _;
    }

    modifier requireFlightRegistered(address airline, string flight, uint256 departureTimestamp) {
        bytes32 flightKey = getFlightKey(airline, flight, departureTimestamp);
        require(flights[flightKey].exists, "Flight does not exists");
        _;
    }

    /**
    * @dev Modifier that checks Airline has met approval conditions
    */
    modifier updatesAirlineApproval(address airline)
    {
        _;
        if (airlines[airline].votes.voteCount > airlinesCount.div(100 / minPercentageVotesRequired)) {
            approveAirline(airline);
        }
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational() public view returns(bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus(bool mode) external
        requireContractOwner()
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline(address airlineAddress, bool isConsensusNeeded)
        external
        requireIsOperational
        returns (uint256)
    {
        if (airlinesCount > 0) {
            require(authorizedContracts[msg.sender] == true, 'Unauthorized Contract');
        }

        require(airlines[airlineAddress].exists == false, 'Airline has already been registered');
        
        airlines[airlineAddress] = Airline({
            exists: true,
            isApproved: !isConsensusNeeded,
            isFunded: false,
            registeredNumber: airlinesCount,
            votes: Votes(0)
        });

        airlinesCount = airlinesCount.add(1);
        emit AirlineRegistered(airlineAddress);
        return airlines[airlineAddress].registeredNumber;
    }

    /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function voteAirline(address candidateAirlineAddress, address voterAirlineAddress)
        external
        requireIsOperational
        requireAuthorizedContracts
        updatesAirlineApproval(candidateAirlineAddress)
    {
        airlines[candidateAirlineAddress].votes.voters[voterAirlineAddress] = true;
        airlines[candidateAirlineAddress].votes.voteCount = airlines[candidateAirlineAddress].votes.voteCount.add(1);
    }

    function approveAirline(address candidateAirlineAddress)
        public
        requireIsOperational
        requireAuthorizedContracts
        requireAirlineApproval(candidateAirlineAddress)
        requireAirlineApprovalConditions(candidateAirlineAddress)
    {
        airlines[candidateAirlineAddress].isApproved = true;
    }

    function registerFlight(address airline, string flight, uint256 departureTimestamp) external
        requireIsOperational
        requireAuthorizedContracts
        requireAirlineExists(airline)
        returns(bytes32)
    {
        bytes32 flightKey = getFlightKey(airline, flight, departureTimestamp);
        require(flights[flightKey].exists != true, 'Flight has already been registered');
        flights[flightKey].exists = true;
        flights[flightKey].name = flight;
        flights[flightKey].departureTimestamp = departureTimestamp;
        flights[flightKey].airline = airline;
        return flightKey;
    }

    function setFlightStatus(address airline, string flight, uint8 statusCode, uint256 departureTimestamp)
        external
    {
        bytes32 flightKey = getFlightKey(airline, flight, departureTimestamp);
        flights[flightKey].statusCode = statusCode;
    }


   /**
    * @dev Buy insurance for a flight
    *
    */
    function buy(address airline, string flight, uint256 timestamp) 
        external 
        payable
        requireIsOperational
        requireFlightRegistered(airline, flight, timestamp)
    {
        require(msg.value > 0 && msg.value <= 1 ether, 'Pay up to 1 Ether');
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        insurances[flightKey].push(InsurancePolicy({
            insuredAddress: msg.sender,
            insuredValue: msg.value,
            insuredFlight: flightKey,
            isRefunded: false
        }));

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(address airline, string flightNumber, uint256 departureTimestamp) external
        requireIsOperational
        requireAuthorizedContracts
        requireFlightRegistered(airline, flightNumber, departureTimestamp)
    {
        bytes32 flightKey = getFlightKey(airline, flightNumber, departureTimestamp);
        // Flight storage flight = flights[flightKey];

        for (uint256 i = 0; i < insurances[flightKey].length; i++) {
            InsurancePolicy storage policy = insurances[flightKey][i];
            if (!policy.isRefunded) {
                uint256 refundAmount = policy.insuredValue.mul(3).div(2);
                emit PassengerRefunded(policy.insuredAddress, refundAmount);
                policy.isRefunded = true;
                if (passengerBalances[policy.insuredAddress].exists) {
                    passengerBalances[policy.insuredAddress].balance = passengerBalances[policy.insuredAddress].balance.add(refundAmount);
                } else {
                    passengerBalances[policy.insuredAddress] = Passenger({
                        exists: true,
                        passengerAddress: policy.insuredAddress,
                        balance: refundAmount
                    });
                }
                
            }
        }
    }

    function getPassengerBalance() 
        external
        view
        requireIsOperational
        returns(uint256)
    {
        require(passengerBalances[msg.sender].exists == true, 'Passenger does not exists or has an insurance policy');
        return passengerBalances[msg.sender].balance;
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(address passenger) 
        external
        requireIsOperational
        requireAuthorizedContracts
    {
        require(passengerBalances[passenger].balance > 0, 'No balances to withdraw from');
        require(address(this).balance > passengerBalances[passenger].balance, 'Current funds in correct insufficient');
        uint256 amount = passengerBalances[passenger].balance;
        passengerBalances[passenger].balance = 0;
        passenger.transfer(amount);
        emit PassengerPaid(passenger, amount);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund(address airlineAddress) public payable
        requireIsOperational
        requireAuthorizedContracts
        requireAirlineExists(airlineAddress)
        requireAirlineApproved(airlineAddress)
    {
        airlines[airlineAddress].isFunded = true;
        emit AirlineFunded(airlineAddress);
    }

    function isAirlineRegisteredApprovedAndFunded(address airline) 
        external
        view
        requireIsOperational()
        returns(bool)
    {
        return airlines[airline].exists && airlines[airline].isApproved && airlines[airline].isFunded;
    }

    function isAirlineApproved(address airline) 
        external
        view
        requireIsOperational()
        returns(bool)
    {
        return airlines[airline].isApproved;
    }

    function isAirlineFunded(address airline) 
        external
        view
        requireIsOperational()
        returns(bool)
    {
        return airlines[airline].isFunded;
    }

    function isAirlineRegistered(address airline) 
        external
        view
        requireIsOperational()
        returns(bool)
    {
        return airlines[airline].exists;
    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function isFlightRegistered(address airline, string flight, uint256 departureTimestamp) 
        external 
        view
        requireIsOperational
        requireAuthorizedContracts
        requireAirlineExists(airline)
        returns(bool)
    {
        bytes32 flightKey = getFlightKey(airline, flight, departureTimestamp);
        return flights[flightKey].exists;
    }

    function getAirlinesCount() external view returns (uint256) {
        return airlinesCount;
    }

    function authorizeContract(address appContract) public
        requireIsOperational
        requireContractOwner
    {
        authorizedContracts[appContract] = true;
    }

    function deauthorizeContract(address appContract) public
        requireContractOwner
        requireIsOperational
    {
        require(appContract != contractOwner, 'Cannot deauthorize this address.');
        delete authorizedContracts[appContract];
    }

    function setMinimumAirlineConsensus(uint256 numberOfAirlines) external
        requireIsOperational
    {
        minAirlineConsensusThreshold = numberOfAirlines;
    }

    function getMinimumAirlineConsensus() 
        external
        view
        requireIsOperational
        returns(uint256)
    {
        return minAirlineConsensusThreshold;
    }

    function setMinimumInitialFund(uint256 minFund) external
        requireIsOperational
    {
        minInitialFund = minFund;
    }

    function getMinimumInitialFund() 
        external
        view 
        requireIsOperational
        returns(uint256)
    {
        return minInitialFund;
    }

    function getAirline(address airline)
        public 
        view
        returns(bool)
    {
        return airlines[airline].exists;
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable
    {
        fund(msg.sender);
    }


}

