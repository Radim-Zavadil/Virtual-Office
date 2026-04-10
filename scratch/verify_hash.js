const bcrypt = require('bcryptjs');
const password = 'rada123';
const hashFromUser = '$2b$10$Kz9KhBgPfNuxlGfteDlEDONbhd7W2kqSJDOKGZkmrjMIOOb1BGnO2';

bcrypt.hash(password, 10).then(generatedHash => {
    console.log('Generated Hash:', generatedHash);
    console.log('Comparison with User Hash:', bcrypt.compareSync(password, hashFromUser));
    console.log('Comparison with Generated Hash:', bcrypt.compareSync(password, generatedHash));
});
