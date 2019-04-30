import React from 'react'
import ReactDOM from 'react-dom'
import Web3Js from 'web3'
import ABI from '../build/contracts/SocialMedia.json'
import './index.css'

class Main extends React.Component {
    constructor() {
        super()

        this.state = {
            followedHashtags: [],
            contentsBlock: 'Loading please wait...',
            topHashtagsBlock: 'Loading please wait...',
            followedHashtagsBlock: 'Loading please wait...',
            displaySubscribe: false,
            displaySubscribeId: '',
            user: '',
            contract: '',
        }

        this.setup()
    }

    bytes32(name) {
        let nameHex = web3js.utils.toHex(name)
        for(let i = nameHex.length; i < 66; i++) {
            nameHex = nameHex + '0'
        }
        return nameHex
    }

    async setup() {
        window.web3js = new Web3Js(ethereum)
        try {
            await ethereum.enable();
        } catch (error) {
            alert('You must approve this dApp to interact with it, reload it to approve it')
        }
        const user = (await web3js.eth.getAccounts())[0]
        window.contract = new web3js.eth.Contract(ABI.abi, ABI.networks['3'].address, {
            from: user
        })
        await this.setState({contract, user})
        await this.getHashtags()
        await this.getContent()
    }

    async publishContent(message, hashtags) {
        if(message.length == 0) alert('You must write a message')
        hashtags = hashtags.trim().replace(/#*/g, '').replace(/,+/g, ',').split(',').map(element => this.bytes32(element.trim()))
        message = this.bytes32(message)
        try {
            await this.state.contract.methods.addContent(message, hashtags).send({
                from: this.state.user,
                gas: 8e6
            })
        } catch (e) {console.log('Error', e)}
        await this.getHashtags()
        await this.getContent()
    }

    async getHashtags() {
        let topHashtagBlock
        let followedHashtagsBlock
        const amount = 10
        const topHashtags = (await contract.methods.getTopHashtags(amount).call()).map(element => web3js.utils.toUtf8(element))
        const followedHashtags = (await this.state.contract.methods.getFollowedHashtags().call()).map(element => web3js.utils.toUtf8(element))
        if(topHashtags.length == 0) {
            topHashtagBlock = 'There are no hashtags yet, come back later!'
        } else {
            topHashtagBlock = topHashtags.map((hashtag, index) => (
                <div key={index}>
                    <Hashtag
                        hashtag={hashtag}
                        contract={this.state.contract}
                        subscribe={hashtag => this.subscribe(hashtag)}
                        unsubscribe={hashtag => this.unsubscribe(hashtag)}
                    />
                </div>
            ))
        }
        if(followedHashtags.length == 0) {
            followedHashtagsBlock = "You're not following any hashtags yet"
        } else {
            followedHashtagsBlock = followedHashtags.map((hashtag, index) => (
                <div key={index}>
                    <Hashtag
                        hashtag={hashtag}
                        contract={this.state.contract}
                        subscribe={hashtag => this.subscribe(hashtag)}
                        unsubscribe={hashtag => this.unsubscribe(hashtag)}
                    />
                </div>
            ))
        }
        this.setState({topHashtagBlock, followedHashtagsBlock, followedHashtags})
    }

    async getContent() {
        const latestContentId = await this.state.contract.methods.latestContentId().call()
        const amount = 10
        const amountPerHashtag = 3
        let contents = []
        let counter = amount
        // If we have subscriptions, get content for those subscriptions
        if(this.state.followedHashtags.length > 0) {
            for(let i = 0; i < this.state.followedHashtags.length; i++) {
                // Get 3 contents per hashtag
                let contentIds = await this.state.contract.methods.getContentIdsByHashtag(this.bytes32(this.state.followedHashtags[i]), 3).call()
                let counterTwo = amountPerHashtag
                if(contentIds < amountPerHashtag) counterTwo = contentIds
                for(let a = counterTwo - 1; a >= 0; a--) {
                    let content = await this.state.contract.methods.getContentById(i).call()
                    content = {
                        id: content[0],
                        author: content[1],
                        time: new Date(parseInt(content[2] + '000')).toLocaleDateString(),
                        message: content[3],
                        hashtags: content[4],
                    }
                    content.message = web3js.utils.toUtf8(content.message)
                    content.hashtags = content.hashtags.map(hashtag => web3js.utils.toUtf8(hashtag))
                    contents.push(content)
                }
            }
        }

        // If we don't have enough content yet, show whats in there
        if(latestContentId < amount) counter = latestContentId
        for(let i = counter - 1; i >= 0; i--) {
            let content = await this.state.contract.methods.getContentById(i).call()
            content = {
                id: content[0],
                author: content[1],
                time: new Date(parseInt(content[2] + '000')).toLocaleDateString(),
                message: content[3],
                hashtags: content[4],
            }
            content.message = web3js.utils.toUtf8(content.message)
            content.hashtags = content.hashtags.map(hashtag => web3js.utils.toUtf8(hashtag))
            contents.push(content)
        }

        let contentsBlock = await Promise.all(contents.map(async (element, index) => (
            <div key={index} className="content">
                <div className="content-address">{element.author}</div>
                <div className="content-message">{element.message}</div>
                <div className="content-hashtags">{element.hashtags.map((hashtag, i) => (
                    <span key={i}>
                        <Hashtag
                            hashtag={hashtag}
                            contract={this.state.contract}
                            subscribe={hashtag => this.subscribe(hashtag)}
                            unsubscribe={hashtag => this.unsubscribe(hashtag)}
                        />
                    </span>
                ))}
                </div>
                <div className="content-time">{element.time}</div>
            </div>
        )))

        this.setState({contentsBlock})
    }

    async subscribe(hashtag) {
        try {
            await this.state.contract.methods.subscribeToHashtag(this.bytes32(hashtag)).send({from: this.state.user})
        } catch(e) { console.log(e) }
        await this.getHashtags()
        await this.getContent()
    }

    async unsubscribe(hashtag) {
        try {
            await this.state.contract.methods.unsubscribeToHashtag(this.bytes32(hashtag)).send({from: this.state.user})
        } catch(e) { console.log(e) }
        await this.getHashtags()
        await this.getContent()
    }

    render() {
        return (
            <div className="main-container">
                <div className="hashtag-block">
                    <h3>Top hashtags</h3>
                    <div className="hashtag-container">{this.state.topHashtagBlock}</div>
                    <h3>Followed hashtags</h3>
                    <div className="hashtag-container">{this.state.followedHashtagsBlock}</div>
                </div>
                <div className="content-block">
                    <div className="input-container">
                        <textarea ref="content" placeholder="Publish content..."></textarea>
                        <input ref="hashtags" type="text" placeholder="Hashtags separated by commas without the # sign..."/>
                        <button onClick={() => {
                            this.publishContent(this.refs.content.value, this.refs.hashtags.value)
                        }} type="button">Publish</button>
                    </div>

                    <div className="content-container">
                        {this.state.contentsBlock}
                    </div>
                </div>
            </div>
        )
    }
}

class Hashtag extends React.Component {
    constructor(props) {
        super()
        this.state = {
            displaySubscribe: false,
            displayUnsubscribe: false,
            checkSubscription: false,
            isSubscribed: false,
        }
    }

    componentDidMount() {
        this.checkExistingSubscription()
    }

    bytes32(name) {
        let nameHex = web3js.utils.toHex(name)
        for(let i = nameHex.length; i < 66; i++) {
            nameHex = nameHex + '0'
        }
        return nameHex
    }

    async checkExistingSubscription() {
        const isSubscribed = await this.props.contract.methods.checkExistingSubscription(this.bytes32(this.props.hashtag)).call()
        this.setState({isSubscribed})
    }

    render() {
        return (
            <span onMouseEnter={async () => {
                if(this.state.checkSubscription) await this.checkExistingSubscription()
                if(!this.state.isSubscribed) {
                    this.setState({
                        displaySubscribe: true,
                        displayUnsubscribe: false,
                    })
                } else {
                    this.setState({
                        displaySubscribe: false,
                        displayUnsubscribe: true,
                    })
                }
            }} onMouseLeave={() => {
                this.setState({
                    displaySubscribe: false,
                    displayUnsubscribe: false,
                })
            }}>
                <a className="hashtag" href="#">#{this.props.hashtag}</a>
                <span className="spacer"></span>
                <button onClick={() => {
                    this.props.subscribe(this.props.hashtag)
                    this.setState({checkSubscription: true})
                }} className={this.state.displaySubscribe ? '' : 'hidden'} type="button">Subscribe</button>
                <button onClick={() => {
                    this.props.unsubscribe(this.props.hashtag)
                    this.setState({checkSubscription: true})
                }} className={this.state.displayUnsubscribe ? '' : 'hidden'} type="button">Unsubscribe</button>
                <span className="spacer"></span>
            </span>
        )
    }
}

ReactDOM.render(<Main />, document.querySelector('#root'))
