const BaseRepository = require('./baseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('tknhanvien');
  }

  async findByUsername(userName) {
    return this.findOne({ userName });
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }
}

class CustomerRepository extends BaseRepository {
  constructor() {
    super('taikhoankh');
  }

  async findByUsername(userName) {
    return this.findOne({ userName });
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }
}

module.exports = {
  userRepository: new UserRepository(),
  customerRepository: new CustomerRepository(),
};
