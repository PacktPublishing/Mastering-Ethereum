import React, { Component } from 'react'
import Header from './Header'

class Orders extends Component {
    constructor() {
        super()

        // We'll separate the completed vs the pending based on the order state
        this.state = {
            pendingSellerOrders: [],
            pendingBuyerOrders: [],
            completedOrders: [],
            pendingSellerOrdersHtml: [],
            pendingBuyerOrdersHtml: [],
            completedOrdersHtml: [],
        }
        this.setup()
    }

    bytes32(name) {
        return myWeb3.utils.fromAscii(name)
    }

    async setup() {
        await this.getOrders(5)
        await this.displayOrders()
    }

    async getOrders(amount) {
        const pendingSellerOrdersLength = parseInt(await contract.methods.getOrdersLength(this.bytes32('seller'), user).call())
        const pendingBuyerOrdersLength = parseInt(await contract.methods.getOrdersLength(this.bytes32('buyer'), user).call())
        const completedOrdersLength = parseInt(await contract.methods.getOrdersLength(this.bytes32('completed'), user).call())

        const conditionSeller = (amount > pendingSellerOrdersLength) ? 0 : pendingSellerOrdersLength - amount
        const conditionBuyer = (amount > pendingBuyerOrdersLength) ? 0 : pendingBuyerOrdersLength - amount
        const conditionCompleted = (amount > completedOrdersLength) ? 0 : completedOrdersLength - amount

        let pendingSellerOrders = []
        let pendingBuyerOrders = []
        let completedOrders = []

        // In reverse to get the most recent orders first
        for(let i = pendingSellerOrdersLength; i > conditionSeller; i--) {
            let order = await contract.methods.pendingSellerOrders(user, i - 1).call()
            pendingSellerOrders.push(await this.generateOrderObject(order))
        }

        for(let i = pendingBuyerOrdersLength; i > conditionBuyer; i--) {
            let order = await contract.methods.pendingBuyerOrders(user, i - 1).call()
            pendingBuyerOrders.push(await this.generateOrderObject(order))
        }

        for(let i = completedOrdersLength; i > conditionCompleted; i--) {
            let order = await contract.methods.completedOrders(user, i - 1).call()
            completedOrders.push(await this.generateOrderObject(order))
        }

        this.setState({pendingSellerOrders, pendingBuyerOrders, completedOrders})
    }

    async generateOrderObject(order) {
        let productAssociated = await contract.methods.productById(parseInt(order.id)).call()
        order = {
            id: parseInt(order.id),
            buyer: order.buyer,
            nameSurname: order.nameSurname,
            lineOneDirection: order.lineOneDirection,
            lineTwoDirection: order.lineTwoDirection,
            city: myWeb3.utils.toUtf8(order.city),
            stateRegion: myWeb3.utils.toUtf8(order.stateRegion),
            postalCode: String(order.postalCode),
            country: myWeb3.utils.toUtf8(order.country),
            phone: String(order.phone),
            state: order.state,
            date: String(productAssociated.date),
            description: productAssociated.description,
            image: productAssociated.image,
            owner: productAssociated.owner,
            price: myWeb3.utils.fromWei(String(productAssociated.price)),
            title: productAssociated.title,
        }
        return order
    }

    async markAsCompleted(id) {
        await contract.methods.markOrderCompleted(id).send()
        await this.setup()
    }

    async displayOrders() {
        let pendingSellerOrdersHtml = []
        let pendingBuyerOrdersHtml = []
        let completedOrdersHtml = []

        if(this.state.pendingSellerOrders.length == 0) {
            pendingSellerOrdersHtml.push((
                <div key="0" className="center">There are no seller orders yet...</div>
            ))
        }
        if(this.state.pendingBuyerOrders.length == 0) {
            pendingBuyerOrdersHtml.push((
                <div key="0" className="center">There are no buyer orders yet...</div>
            ))
        }
        if(this.state.completedOrders.length == 0) {
            completedOrdersHtml.push((
                <div key="0" className="center">There are no completed orders yet...</div>
            ))
        }

        await this.state.pendingSellerOrders.asyncForEach(order => {
            pendingSellerOrdersHtml.push(
                <div key={order.id} className="product">
                    <img className="product-image" src={order.image} />
                    <div className="product-data">
                        <h3 className="small-product-title">{order.title}</h3>
                        <div className="product-state">State: {order.state}</div>
                        <div className="product-description">{order.description.substring(0, 15) + '...'}</div>
                        <div className="product-price">{order.price} ETH</div>
                        <button className="small-view-button" onClick={() => {
                            this.props.setState({product: order})
                            this.props.redirectTo('/product')
                        }} type="button">View</button>
                        <button className="small-completed-button" onClick={() => {
                            this.markAsCompleted(order.id)
                        }} type="button">Mark as completed</button>
                    </div>
                    <div className="order-address">
                        <div>Id</div>
                        <div className="second-column" title={order.id}>{order.id}</div>
                        <div>Buyer</div>
                        <div className="second-column" title={order.buyer}>{order.buyer}</div>
                        <div>Name and surname</div>
                        <div className="second-column" title={order.nameSurname}>{order.nameSurname}</div>
                        <div>Line 1 direction</div>
                        <div className="second-column" title={order.lineOneDirection}>{order.lineOneDirection}</div>
                        <div>Line 2 direction</div>
                        <div className="second-column" title={order.lineTwoDirection}>{order.lineTwoDirection}</div>
                        <div>City</div>
                        <div className="second-column" title={order.city}>{order.city}</div>
                        <div>State or region</div>
                        <div className="second-column" title={order.stateRegion}>{order.stateRegion}</div>
                        <div>Postal code</div>
                        <div className="second-column">{order.postalCode}</div>
                        <div>Country</div>
                        <div className="second-column" title={order.country}>{order.country}</div>
                        <div>Phone</div>
                        <div className="second-column">{order.phone}</div>
                        <div>State</div>
                        <div className="second-column" title={order.state}>{order.state}</div>
                    </div>
                </div>
            )
        })
        await this.state.pendingBuyerOrders.asyncForEach(order => {
            pendingBuyerOrdersHtml.push(
                <div key={order.id} className="product">
                    <img className="product-image" src={order.image} />
                    <div className="product-data">
                        <h3 className="product-title">{order.title}</h3>
                        <div className="product-state">State: {order.state}</div>
                        <div className="product-description">{order.description.substring(0, 15) + '...'}</div>
                        <div className="product-price">{order.price} ETH</div>
                        <button onClick={() => {
                            this.props.setState({product: order})
                            this.props.redirectTo('/product')
                        }} className="product-view" type="button">View</button>
                    </div>
                    <div className="order-address">
                        <div>Id</div>
                        <div className="second-column" title={order.id}>{order.id}</div>
                        <div>Buyer</div>
                        <div className="second-column" title={order.buyer}>{order.buyer}</div>
                        <div>Name and surname</div>
                        <div className="second-column" title={order.nameSurname}>{order.nameSurname}</div>
                        <div>Line 1 direction</div>
                        <div className="second-column" title={order.lineOneDirection}>{order.lineOneDirection}</div>
                        <div>Line 2 direction</div>
                        <div className="second-column" title={order.lineTwoDirection}>{order.lineTwoDirection}</div>
                        <div>City</div>
                        <div className="second-column" title={order.city}>{order.city}</div>
                        <div>State or region</div>
                        <div className="second-column" title={order.stateRegion}>{order.stateRegion}</div>
                        <div>Postal code</div>
                        <div className="second-column">{order.postalCode}</div>
                        <div>Country</div>
                        <div className="second-column" title={order.country}>{order.country}</div>
                        <div>Phone</div>
                        <div className="second-column">{order.phone}</div>
                        <div>State</div>
                        <div className="second-column" title={order.state}>{order.state}</div>
                    </div>
                </div>
            )
        })
        await this.state.completedOrders.asyncForEach(order => {
            completedOrdersHtml.push(
                <div key={order.id} className="product">
                    <img className="product-image" src={order.image} />
                    <div className="product-data">
                        <h3 className="product-title">{order.title}</h3>
                        <div className="product-state">State: {order.state}</div>
                        <div className="product-description">{order.description.substring(0, 15) + '...'}</div>
                        <div className="product-price">{order.price} ETH</div>
                        <button onClick={() => {
                            this.props.setState({product: order})
                            this.props.redirectTo('/product')
                        }} className="product-view" type="button">View</button>
                    </div>
                    <div className="order-address">
                        <div>Id</div>
                        <div className="second-column" title={order.id}>{order.id}</div>
                        <div>Buyer</div>
                        <div className="second-column" title={order.buyer}>{order.buyer}</div>
                        <div>Name and surname</div>
                        <div className="second-column" title={order.nameSurname}>{order.nameSurname}</div>
                        <div>Line 1 direction</div>
                        <div className="second-column" title={order.lineOneDirection}>{order.lineOneDirection}</div>
                        <div>Line 2 direction</div>
                        <div className="second-column" title={order.lineTwoDirection}>{order.lineTwoDirection}</div>
                        <div>City</div>
                        <div className="second-column" title={order.city}>{order.city}</div>
                        <div>State or region</div>
                        <div className="second-column" title={order.stateRegion}>{order.stateRegion}</div>
                        <div>Postal code</div>
                        <div className="second-column">{order.postalCode}</div>
                        <div>Country</div>
                        <div className="second-column" title={order.country}>{order.country}</div>
                        <div>Phone</div>
                        <div className="second-column">{order.phone}</div>
                        <div>State</div>
                        <div className="second-column" title={order.state}>{order.state}</div>
                    </div>
                </div>
            )
        })

        this.setState({pendingSellerOrdersHtml, pendingBuyerOrdersHtml, completedOrdersHtml})
    }

    render() {
        return (
            <div>
                <Header />
                <div className="orders-page">
                    <div>
                        <h3 className="order-title">PENDING ORDERS AS A SELLER</h3>
                        {this.state.pendingSellerOrdersHtml}
                    </div>

                    <div>
                        <h3 className="order-title">PENDING ORDERS AS A BUYER</h3>
                        {this.state.pendingBuyerOrdersHtml}
                    </div>

                    <div className="completed-orders-container">
                        <h3 className="order-title">COMPLETED ORDERS</h3>
                        {this.state.completedOrdersHtml}
                    </div>
                </div>
            </div>
        )
    }
}

export default Orders
