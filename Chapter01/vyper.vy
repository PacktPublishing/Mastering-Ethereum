# ------- #

myVariableName: public(uint256)

# ------- #

myVariableName: public(uint256) # A public variable
mySecondVariable: uint256 # A private variable

# ------- #

myNumber: uint256

# ------- #

myNumber: int128

# ------- #

isValid: bool

# ------- #

myDecimalNumber: decimal

# ------- #

myAddress: address

# ------- #

username: public(bytes32)
myArticle bytes[1000]

# ------- #

whenThisWasDone: timestamp
expiresIn: timedelta

# ------- #

amountSpent: wei_value

# ------- #

units: {
    centimeter: "centimeter",
    km: "kilometer"
}
myCustomMeasure: uint256(centimeter)
distanceFromMars: decimal(km)

# ------- #

# An array of uints
myNumbers: public(uint256[10])

# A multidimensional array of addresses
myAddresses: address[10][20]

# An array of 30 texts of 1000 characters each
myArticles: public(bytes[1000][30])

# ------- #

myNumbers[3] = 25

# With a counter variable it would look like this
myNumbers[latestNumberIndex] = 25

# Set multiple values
myNumbers = [1, 4, 7, 3, 2, 9, 1, 3, 0, 9]

# Get the value of a specific index
return myNumbers[4]

# ------- #

# Create a struct
struct Tree:
    age: timestamp
    name: bytes32

# Create the struct instance variable (inside a function only)
myTrees: Tree[10]

# Initialize the struct (inside a function only)
myTrees[0] = Tree({12, “My own tree”})

# Accessing a value (inside a function only)
myTrees[0].timestamp = 19182

# ------- #

myMapping: map(int128, bool)

# To access a value (can only be done inside functions)
myMapping[28] = True

# ------- #

# Event definition
MyEvent: event({from: indexed(address), amount: uint256})

# Calling the event inside a function
log.MyEvent(msg.sender, 10)

# ------- #

@public
def sumTwoNumbers(numberA: uint256, numberB: uint256) -> uint256:
    return numberA + number

# ------- #

FundsReceived: event({amount: wei_value})

@public
@payable
def receiveFunds():
    log.FundsReceived(msg.value)

# ------- #

myNumber: uint256

@public
def exampleFunction():
    self.myNumber = 3

# ------- #

@public
def __init__():
    # Do something here when the contract is deployed

# ------- #

@public
@payable
def __default__():
    # Do something when receiving a transfer

# ------- #

@public
def addNumbers(numberA: int128, numberB: int128) -> int128:
    """
    @author Merunas Grincalaitis
    @notice Adds 2 given integers and returns the result
    @dev Works with either positive and negative numbers
    @param numberA The first number to add
    @param numberB The second number to add
    @return int128 The number resulting after the addition
    """
    return numberA + numberB
