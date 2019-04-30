import React from 'react'
import Header from './Header'

class Sell extends React.Component {
    constructor() {
        super()
        this.state = {
            title: '',
            description: '',
            price: '',
            image: '',
        }
    }

    async publishProduct() {
        if(this.state.title.length == 0) return alert('You must set the title before publishing the product')
        if(this.state.description.length == 0) return alert('You must set the description before publishing the product')
        if(this.state.price.length == 0) return alert('You must set the price before publishing the product')
        if(this.state.image.length == 0) return alert('You must set the image URL before publishing the product')

        await contract.methods.publishProduct(this.state.title, this.state.description, myWeb3.utils.toWei(this.state.price), this.state.image).send()
    }

    render() {
        return (
            <div>
                <Header />
                <div className="sell-page">
                    <h3>Sell product</h3>
                    <input onChange={event => {
                        this.setState({title: event.target.value})
                    }} type="text" placeholder="Product title..." />
                    <textarea placeholder="Product description..." onChange={event => {
                        this.setState({description: event.target.value})
                    }}></textarea>
                    <input onChange={event => {
                        this.setState({price: event.target.value})
                    }} type="text" placeholder="Product price in ETH..." />
                    <input onChange={event => {
                        this.setState({image: event.target.value})
                    }} type="text" placeholder="Product image URL..." />
                    <p>Note that shipping costs are considered free so add the shipping price to the cost of the product itself</p>
                    <button onClick={() => {
                        this.publishProduct(this.state)
                    }} type="button">Publish product</button>
                </div>
            </div>
        )
    }
}

export default Sell
