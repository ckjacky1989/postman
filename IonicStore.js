const express = require('express');
const cors = require('cors');
const app = express();
const port = 8887;
// Use it to hash the password
// ref:https://www.npmjs.com/package/bcryptjs
const bcrypt = require('bcryptjs');
app.use(cors());
app.use(express.json());

const mongoose = require ('mongoose');
const DataBase = 'mongodb://0.0.0.0:27017/assignment4';
mongoose.set('strictQuery', true);

const accountSchema = new mongoose.Schema({
    username: String,
    password: String
});
const Account = mongoose.model('Account', accountSchema);
const productSchema = new mongoose.Schema({
    productID: Number,
    name: String,
    price: Number
});
const Product = mongoose.model('Product', productSchema);
mongoose.connect(DataBase);
const db = mongoose.connection;
db.on('error', (err) => { console.log(err); })

// let products = [];
// let users = [];
let loggedInUser ='';
db.once('open', () => {

// Get products
app.get('/products', (req, res) => {
    Product.find()
        .then(products => {
            res.json(products);
        })
        .catch(err => {
            res.status(500).send(err.message);
        });
});

// Get products by name
app.get('/products/search', (req, res) => {
    const searchQuery = req.query.name;

    // if (!searchQuery) {
    //     return res.status(400).json({ message: 
    //         'Please provide a product name to search' });
    // }

    // $options: 'i' makes it case-insensitive
    // This regex setting makes it supporting partial match
    // ref:https://www.mongodb.com/docs/manual/reference/operator/query/regex/
    Product.find({ name: { $regex: searchQuery, $options: 'i' } }) 
        .then(products => {
            res.json(products);
        })
        .catch(err => {
            console.error('Error searching products:', err);
            res.status(500).json({ message: 'Server error during product search' });
        });
});

// Add product
app.post('/products', (req, res) => {
    Product.countDocuments()
        .then(count => {
            const productID = count + 1;
            const name = req.body.name;
            const price = req.body.price;
            const newProduct = new Product({ productID, name, price });

            if(!name){
                return res.status(400).json({ message: 'Empty name' });
            }
            if(!price){
                return res.status(400).json({ message: 'Empty price' });
            }
            Product.create(newProduct)
                .then(() => {
                    res.json({ message: 'Product added' });
                })
                .catch(err => {
                    res.status(500).send(err.message);
                });
        })
        .catch(err => {
            res.status(500).send(err.message);
        });
});

// Update the product by id
app.put('/products/:id', (req, res) => {
    Product.findOneAndUpdate(
        {productID: req.params.id},
        {name: req.body.name, price: req.body.price},
        // Allow to return the updated document
        {new: true}
    ).then(updatedProduct => {
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }else{
            res.json(updatedProduct);
        }
    })
    .catch(err => {
        res.status(500).send(err.message);
    });
});
// Delete the product by id
app.delete('/products/:id', (req, res) => {
    Product.findOneAndDelete({ productID: req.params.id })
        .then(deletedProduct => {
            if (!deletedProduct) {
                return res.status(404).json({ message: 'Product not found' });
            }else{
            res.json({ message: 'Product deleted' });
            }
        })
        .catch(err => {
            res.status(500).send(err.message);
        });
});
// User signup
app.post('/signup', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    // Check if username already exist
    Account.findOne({ username })
        .then(existingUser => {
            if (existingUser) {
                return res.status(400).json({ message: 'Account already exists' });
            }else{
            // Hash the password before storing to database
            bcrypt.hash(password, 10)
                .then(hashedPassword => {
                    const newUser = new Account({ username,password:hashedPassword });
                    Account.create(newUser)
                        .then(() => {
                            res.json({ message: 'Account added' });
                        })
                        .catch(err => {
                            console.error('Error creating user:', err);
                            res.status(500).json({ message: 
                                'Server error during signup' });
                        });
                })
                .catch(err => {
                    console.error('Error hashing password:', err);
                    res.status(500).json({ message: 
                        'Server error during password hashing' });
                });
            }
        })
        .catch(err => {
            console.error('Error checking if user exists:', err);
            res.status(500).json({ message: 'Server error during user check' });
        });
});
// User login
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    // Find account by username
    Account.findOne({ username })
        .then(user => {
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            // Compare the given password to the hashed password in database
            bcrypt.compare(password, user.password)
                .then(isMatch => {
                    if (!isMatch) {
                        return res.status(401).json({ message: 'Invalid credentials' });
                    }else{
                        loggedInUser = user;
                        res.json({ message: 'Login successful' });
                    }
                })
                .catch(err => {
                    console.error('Error comparing passwords:', err);
                    res.status(500).json({ message: 
                        'Server error during password comparison' });
                });
        })
        .catch(err => {
            console.error('Error finding user:', err);
            res.status(500).json({ message: 'Server error during user lookup' });
        });
});
// Get loggedInUser
app.get('/loggedInUser', (req, res) => res.json(loggedInUser || ''));

// User logout
app.post('/logout', (req, res) => {
    if (loggedInUser) {
        loggedInUser = '';
        // Send a json response with message
        res.json({ message: 'Logout successful' });
    } else {
        res.status(400).json({ message: 'Not logged in' });
    }
});

});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
