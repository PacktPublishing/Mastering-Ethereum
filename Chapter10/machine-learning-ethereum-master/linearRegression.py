from random import uniform

class LinearRegression:
    xs = [3520, 192, 91, 9271]
    results = [20, 3, 0, 88]

    def __init__(self):
        initialWeight = uniform(0, 1)
        initialBias = uniform(0, 1)
        learningRate = 0.00000004
        iterations = 2000

        print('Initial weight {}, Initial bias {}, Learning rate {}, Iterations {}'.format(initialWeight, initialBias, learningRate, iterations))
        finalWeight, finalBias = self.train(self.results, initialWeight, initialBias, self.xs, learningRate, iterations)
        finalError = self.cost(self.results, finalWeight, finalBias, self.xs)
        print('Final weight {:.4f}, Final bias {:.4f}, Final error {:.4f}, Prediction {:.4f} out of {}, Prediction Two {:.4f} out of {}'.format(finalWeight, finalBias, finalError, self.prediction(self.xs[1], finalWeight, finalBias), self.results[1], self.prediction(self.xs[3], finalWeight, finalBias), self.results[3]))

    # Python implementation
    def prediction(self, x, weight, bias):
        return weight * x + bias

    # The cost function implemented in python
    def cost(self, results, weight, bias, xs):
        error = 0.0
        numberOfDataPoints = len(xs)
        for i in range(numberOfDataPoints):
            error += (results[i] - (weight * xs[i] + bias)) ** 2
        return error / numberOfDataPoints

    # Python implementation, returns the optimized weight and bias for that step
    def optimizeWeightBias(self, results, weight, bias, xs, learningRate):
        weightDerivative = 0
        biasDerivative = 0
        numberOfDataPoints = len(results)
        for i in range(numberOfDataPoints):
            weightDerivative += -2 * xs[i] * (results[i] - (xs[i] * weight + bias))
            biasDerivative += -2 * (results[i] - (xs[i] * weight + bias))

        weight -= (weightDerivative / numberOfDataPoints) * learningRate
        bias -= (biasDerivative / numberOfDataPoints) * learningRate

        return weight, bias

    # Python implementation
    def train(self, results, weight, bias, xs, learningRate, iterations):
        error = 0
        for i in range(iterations):
            weight, bias = self.optimizeWeightBias(results, weight, bias, xs, learningRate)
            error = self.cost(results, weight, bias, xs)
            print("Iteration: {}, weight: {:.4f}, bias: {:.4f}, error: {:.2f}".format(i, weight, bias, error))
        return weight, bias

# Initialize the class
LinearRegression()
