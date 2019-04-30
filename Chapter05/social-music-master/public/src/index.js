import React from 'react'
import ReactDOM from 'react-dom'
import myWEB3 from 'web3'
import './index.css'
import ABI from '../build/contracts/SocialMusic.json'

class Main extends React.Component {
    constructor() {
        super()

        window.myWeb3 = new myWEB3(myWEB3.givenProvider)
        this.state = {
            isFormHidden: true,
            isAddMusicHidden: true,
            isFollowPeopleHidden: true,
            followUsersData: [],
            userAddress: ''
        }

        this.setContractInstance()
    }

    async setContractInstance() {
        const contractAddress = ABI.networks['3'].address
        const abi = ABI.abi
        const userAddress = (await myWeb3.eth.getAccounts())[0]
        await this.setState({userAddress})
        const contractInstance = new myWeb3.eth.Contract(abi, contractAddress, {
            from: this.state.userAddress,
            gasPrice: 2e9
        })
        await this.setState({contractInstance: contractInstance})
    }

    fillBytes32WithSpaces(name) {
        let nameHex = myWeb3.utils.toHex(name)
        for(let i = nameHex.length; i < 66; i++) {
            nameHex = nameHex + '0'
        }
        return nameHex
    }

    hideAllSections() {
        this.setState({
            isFormHidden: true,
            isAddMusicHidden: true,
            isFollowPeopleHidden: true
        })
    }

    async send(functionName, parameters) {
        await this.state.contractInstance.methods[functionName](parameters).send({from: this.state.userAddress})
    }

    async setupAccount(name, age, status) {
        await this.state.contractInstance.methods.setup(this.fillBytes32WithSpaces(name), age, status).send({from: this.state.userAddress})
    }

    async addMusic(music) {
        await this.state.contractInstance.methods.addSong(music).send({from: this.state.userAddress})
    }

    async getFollowPeopleUsersData() {
        let userAddresses = await this.state.contractInstance.methods.getUsersList().call({from: this.state.userAddress})

        // The user object array contains objects like so userObject = {address, name, age, state, recommendations[2], following[]}
        let usersObjects = []

        // Return only the latest 10 users with only 2 recommendations for each, ignore the rest to avoid getting a gigantic list
        if(userAddresses.length > 10) userAddresses = userAddresses.slice(0, 10)
        for(let i = 0; i < userAddresses.length; i++) {
            let {age, name, state} = await this.state.contractInstance.methods.users(userAddresses[i]).call({from: this.state.userAddress})
            let userData = {
                address: userAddresses[i],
                age,
                name,
                state,
                recommendations: [],
                following: []
            }
            let usersMusicRecommendationLength = await this.state.contractInstance.methods.getUsersMusicRecommendationLength(userAddresses[i]).call({from: this.state.userAddress})
            // We only want to get the 2 latests music recommendations of each user
            if(usersMusicRecommendationLength > 2) usersMusicRecommendationLength = 2
            for(let a = 0; a < usersMusicRecommendationLength; a++) {
                const recommendation = await this.state.contractInstance.methods.getUsersMusicRecommendation(userAddresses[i], a).call({from: this.state.userAddress})
                userData.recommendations.push(recommendation)
            }
            let following = await this.state.contractInstance.methods.getUsersFollowings(userAddresses[i]).call({from: this.state.userAddress})
            userData.following = following
            usersObjects.push(userData)
        }
        await this.setState({followUsersData: usersObjects})
    }

    async followUser(address) {
        await this.state.contractInstance.methods.follow(address).send({from: this.state.userAddress})
    }

    render() {
        return (
            <div>
                <h1>Welcome to Decentralized Social Music!</h1>
                <p>Setup your account, start adding musical recommendations for your friends and follow people that may interest you</p>
                <div className="buttons-container">
                    <button onClick={() => {
                        this.hideAllSections()
                        if(this.state.isFormHidden) this.setState({isFormHidden: false})
                        else this.setState({isFormHidden: true})
                    }}>Setup Account</button>
                    <button onClick={() => {
                        this.hideAllSections()
                        if(this.state.isAddMusicHidden) this.setState({isAddMusicHidden: false})
                        else this.setState({isAddMusicHidden: true})
                    }}>Add Music</button>
                    <button onClick={() => {
                        this.hideAllSections()
                        if(this.state.isFollowPeopleHidden) this.setState({isFollowPeopleHidden: false})
                        else this.setState({isFollowPeopleHidden: true})
                        this.getFollowPeopleUsersData()
                    }}>Follow People</button>
                </div>

                <Form
                    className={this.state.isFormHidden ? 'hidden' : ''}
                    cancel={() => {
                        this.setState({isFormHidden: true})
                    }}
                    setupAccount={(name, age, status) => {
                        this.setupAccount(name, age, status)
                    }}
                />

                <AddMusic
                    className={this.state.isAddMusicHidden ? 'hidden': ''}
                    cancel={() => {
                        this.setState({isAddMusicHidden: true})
                    }}
                    addMusic={music => {
                        this.addMusic(music)
                    }}
                />

                <FollowPeopleContainer
                    className={this.state.isFollowPeopleHidden ? 'hidden': 'follow-people-container'}
                    close={() => {
                        this.setState({isFollowPeopleHidden: true})
                    }}
                    userAddress={this.state.userAddress}
                    followUsersData={this.state.followUsersData}
                    followUser={address => {
                        this.followUser(address)
                    }}
                />

                <h3>Latest musical recommendations from people using the dApp</h3>
                <div ref="general-recommendations">
                    <Recommendation
                        name="John"
                        address="0x5912d3e530201d7B3Ff7e140421F03A7CDB386a3"
                        song="Regulate - Nate Dogg"
                    />
                    <Recommendation
                        name="Martha"
                        address="0x1034403ad2f8e9da55272CEA16ec1f2cBdae0E5c"
                        song="X - Xzibit"
                    />
                    <Recommendation
                        name="Maria"
                        address="0x15D59aF5c4CE1fF5e2c45B2047930d41A837Cd74"
                        song="Red Lights - Ghost'n'ghost"
                    />
                    <Recommendation
                        name="Tomas"
                        address="0x809E1D7895B930f638dFe37a110078036062E5C9"
                        song="Yalla - INNA"
                    />
                    <Recommendation
                        name="Winston"
                        address="0x2f6ccd575FA71e2912a31b65F7aFF45C8bf91155"
                        song="Casanova - Thomas Hayden"
                    />
                </div>
            </div>
        )
    }
}

class Recommendation extends React.Component {
    constructor() {
        super()
    }

    render() {
        return (
            <div className="recommendation">
                <div className="recommendation-name">{this.props.name}</div>
                <div className="recommendation-address">{this.props.address}</div>
                <div className="recommendation-song">{this.props.song}</div>
            </div>
        )
    }
}

class Form extends React.Component {
    constructor() {
        super()
    }

    render() {
        return (
            <form className={this.props.className}>
                <input className="form-input" type="text" ref="form-name" placeholder="Your name" />
                <input className="form-input" type="number" ref="form-age" placeholder="Your age" />
                <textarea className="form-input form-textarea" ref="form-state" placeholder="Your state, a description about yourself"></textarea>
                <div>
                    <button onClick={event => {
                        event.preventDefault()
                        this.props.cancel()
                    }} className="cancel-button">Cancel</button>
                    <button onClick={event => {
                        event.preventDefault()
                        this.props.setupAccount(this.refs['form-name'].value, this.refs['form-age'].value, this.refs['form-state'].value)
                    }}>Submit</button>
                </div>
            </form>
        )
    }
}

class AddMusic extends React.Component {
    constructor() {
        super()
    }

    render() {
        return(
            <div className={this.props.className}>
                <input type="text" ref="add-music-input" className="form-input" placeholder="Your song recommendation"/>
                <div>
                    <button onClick={event => {
                        event.preventDefault()
                        this.props.cancel()
                    }} className="cancel-button">Cancel</button>
                    <button onClick={event => {
                        event.preventDefault()
                        this.props.addMusic(this.refs['add-music-input'].value)
                    }}>Submit</button>
                </div>
            </div>
        )
    }
}

class FollowPeopleContainer extends React.Component {
    constructor() {
        super()
    }

    render() {
        let followData = this.props.followUsersData
        // Remove the users that you already follow so that you don't see em
        for(let i = 0; i < followData.length; i++) {
            let indexOfFollowing = followData[i].following.indexOf(this.props.userAddress)
            if(indexOfFollowing != -1) {
                followData = followData.splice(indexOfFollowing, 1)
            }
        }
        return (
            <div className={this.props.className}>
                {followData.map(user => (
                    <FollowPeopleUnit
                        key={user.address}
                        address={user.addres}
                        age={user.age}
                        name={user.name}
                        state={user.state}
                        recommendations={user.recommendations}
                        following={user.following}
                        followUser={() => {
                            this.props.followUser(user.address)
                        }}
                    />
                ))}
            </div>
        )
    }
}

class FollowPeopleUnit extends React.Component {
    constructor() {
        super()
    }

    render() {
        return (
            <div className="follow-people-unit">
                <div className="follow-people-address">{this.props.address}</div>
                <div className="follow-people-name">{myWeb3.utils.toUtf8(this.props.name)}</div>
                <div className="follow-people-age">{this.props.age}</div>
                <div className="follow-people-state">"{this.props.state}"</div>
                <div className="follow-people-recommendation-container">
                    {this.props.recommendations.map((message, index) => (
                        <div key={index} className="follow-people-recommendation">{message}</div>
                    ))}
                </div>
                <button
                    className="follow-button"
                    onClick={() => {
                        this.props.followUser()
                    }}
                >Follow</button>
            </div>
        )
    }
}

ReactDOM.render(<Main ref={(myComponent) => {window.myComponent = myComponent}} />, document.querySelector('#root'))
