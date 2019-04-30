import React, { Component } from 'react'
import Header from './Header'

class Buy extends Component {
    constructor() {
        super()
        this.state = {
            nameSurname: '',
            lineOneDirection: '',
            lineTwoDirection: '',
            city: '',
            stateRegion: '',
            postalCode: '',
            country: '',
            phone: '',
        }
    }

    bytes32(name) {
        return myWeb3.utils.fromAscii(name)
    }

    async buyProduct() {
        await contract.methods.buyProduct(this.props.product.id, this.state.nameSurname, this.state.lineOneDirection, this.state.lineTwoDirection, this.bytes32(this.state.city), this.bytes32(this.state.stateRegion), this.state.postalCode, this.bytes32(this.state.country), this.state.phone).send({
            value: myWeb3.utils.toWei(this.props.product.price)
        })
    }

    render() {
        return (
            <div>
                <Header />
                <div className="product-buy-page">
                    <h3 className="title">Product details</h3>
                    <img className="product-image" src={this.props.product.image} />
                    <div className="product-data">
                        <p className="product-title">{this.props.product.title}</p>
                        <div className="product-price">{this.props.product.price} ETH</div>
                    </div>
                </div>
                <div className="shipping-buy-page">
                    <h3>Shipping</h3>
                    <input onChange={e => {
                        this.setState({nameSurname: e.target.value})
                    }} placeholder="Name and surname..." type="text" />
                    <input onChange={e => {
                        this.setState({lineOneDirection: e.target.value})
                    }} placeholder="Line 1 direction..." type="text" />
                    <input onChange={e => {
                        this.setState({lineTwoDirection: e.target.value})
                    }} placeholder="Line 2 direction..." type="text" />
                    <input onChange={e => {
                        this.setState({city: e.target.value})
                    }} placeholder="City..." type="text" />
                    <input onChange={e => {
                        this.setState({stateRegion: e.target.value})
                    }} placeholder="State or region..." type="text" />
                    <input onChange={e => {
                        this.setState({postalCode: e.target.value})
                    }} placeholder="Postal code..." type="number" />
                    <input onChange={e => {
                        this.setState({country: e.target.value})
                    }} placeholder="Country..." type="text" />
                    <input onChange={e => {
                        this.setState({phone: e.target.value})
                    }} placeholder="Phone..." type="number" />
                    <button onClick={() => {
                        this.buyProduct()
                    }}>Buy now to this address</button>
                </div>
            </div>
        )
    }
}

export default Buy
