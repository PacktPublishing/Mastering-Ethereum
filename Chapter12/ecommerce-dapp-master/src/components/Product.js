import React from 'react'
import Header from './Header'

class Product extends React.Component {
    constructor() { super() }
    render() {
        return (
            <div>
                <Header />
                <div className="product-details">
                    <img className="product-image" src={this.props.product.image} />
                    <div className="product-data">
                        <h3 className="product-title">{this.props.product.title}</h3>
                        <ul className="product-description">
                            {this.props.product.description.split('\n').map((line, index) => (
                                <li key={index}>{line}</li>
                            ))}
                        </ul>
                        <div className="product-data-container">
                            <div className="product-price">{this.props.product.price} ETH</div>
                        </div>
                        <button onClick={() => {
                            this.props.redirectTo('/buy')
                        }} className="product-buy" type="button">Buy</button>
                    </div>
                </div>
            </div>
        )
    }
}

export default Product
