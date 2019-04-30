import React from 'react'
import ReactDOM from 'react-dom'
import MyWeb3 from 'web3'
import { BrowserRouter, Route, withRouter } from 'react-router-dom'
import Home from './components/Home'
import Product from './components/Product'
import Sell from './components/Sell'
import Header from './components/Header'
import Buy from './components/Buy'
import Orders from './components/Orders'
import './index.styl'
import ABI from '../build/contracts/Ecommerce.json'

Array.prototype.asyncForEach = function (callback) {
    return new Promise(resolve => {
        for(let i = 0; i < this.length; i++) {
            callback(this[i], i, this)
        }
        resolve()
    })
}

class Main extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            products: [],
            productsHtml: [],
            product: {},
        }

        this.setup()
    }

    async setup() {
        // Create the contract instance
        window.myWeb3 = new MyWeb3(ethereum)
        try {
            await ethereum.enable();
        } catch (error) {
            console.error('You must approve this dApp to interact with it')
        }
        window.user = (await myWeb3.eth.getAccounts())[0]
        window.contract = new myWeb3.eth.Contract(ABI.abi, ABI.networks['3'].address, {
            from: user
        })
        await this.getLatestProducts(9)
        await this.displayProducts()
    }

    async displayProducts() {
        let productsHtml = []
        if(this.state.products.length == 0) {
            productsHtml = (
                <div key="0" className="center">There are no products yet...</div>
            )
        }
        await this.state.products.asyncForEach(product => {
            productsHtml.push((
                <div key={product.id} className="product">
                    <img className="product-image" src={product.image} />
                    <div className="product-data">
                        <h3 className="product-title">{product.title}</h3>
                        <div className="product-description">{product.description.substring(0, 50) + '...'}</div>
                        <div className="product-price">{product.price} ETH</div>
                        <button onClick={() => {
                            this.setState({product})
                            this.redirectTo('/product')
                        }} className="product-view" type="button">View</button>
                    </div>
                </div>
            ))
        })
        this.setState({productsHtml})
    }

    redirectTo(location) {
    	this.props.history.push({
    		pathname: location
    	})
    }

    async getLatestProducts(amount) {
        // Get the product ids
        const productsLength = parseInt(await contract.methods.getProductsLength().call())
        let products = []
        let condition = (amount > productsLength) ? 0 : productsLength - amount

        // Loop through all of them one by one
        for(let i = productsLength; i > condition; i--) {
            let product = await contract.methods.products(i - 1).call()
            product = {
                id: parseInt(product.id),
                title: product.title,
                date: parseInt(product.date),
                description: product.description,
                image: product.image,
                owner: product.owner,
                price: myWeb3.utils.fromWei(String(product.price)),
            }
            products.push(product)
        }
        this.setState({products})
    }

    render() {
        return (
            <div>
                <Route path="/product" render={() => (
                    <Product
                        product={this.state.product}
                        redirectTo={location => this.redirectTo(location)}
                    />
                )}/>
                <Route path="/sell" render={() => (
                    <Sell
                        publishProduct={data => this.publishProduct(data)}
                    />
                )}/>
                <Route path="/buy" render={() => (
                    <Buy
                        product={this.state.product}
                    />
                )} />
                <Route path="/orders" render={() => (
                    <Orders
                        setState={state => this.setState(state)}
                        redirectTo={location => this.redirectTo(location)}
                    />
                )} />
                <Route path="/" exact render={() => (
                    <Home
                        productsHtml={this.state.productsHtml}
                    />
                )} />
            </div>
        )
    }
    }

// To be able to access the history in order to redirect users programatically when opening a product
Main = withRouter(Main)

ReactDOM.render(
    <BrowserRouter>
        <Main />
    </BrowserRouter>,
document.querySelector('#root'))
