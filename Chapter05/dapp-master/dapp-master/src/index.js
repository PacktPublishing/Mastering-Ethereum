import React from 'react'
import ReactDOM from 'react-dom'

class Main extends React.Component {
    constructor() {
        super()
    }

    render() {
        return (
            <div>The project has been setup. Remember to npm install and webpack -w -d to see your changes.</div>
        )
    }
}

ReactDOM.render(<Main />, document.querySelector('#root'))
