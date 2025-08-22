CREATE TABLE garages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    garage_id INT REFERENCES garages(id)
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    garage_id INT REFERENCES garages(id),
    date DATE NOT NULL,
    time TIME NOT NULL,
    service TEXT NOT NULL,
    notes TEXT
);