import React from 'react'
import { Link } from 'react-router-dom'

function Header() {
    return (
        <div className="header">
            <Link to="/">ECOMMERCE</Link>
            <div>
                <Link to="/">Home</Link>
                <Link to="/sell">Sell</Link>
                <Link to="/orders">Orders</Link>
            </div>
        </div>
    )
}

export default Header
