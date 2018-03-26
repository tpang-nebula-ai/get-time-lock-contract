const crowdsale_abi = "./abi/NebulaCrowdsale.json";
const token_abi = "./abi/NebulaToken.json";
const time_locked_abi = "./abi/Timelock.json";
const vesting_abi = "./abi/Vesting.json";

const crowdsale_address = "0x680775f25a1323a7b88cc72847d339c9bff01b93";
const token_address = "0x0eb2a797bb556be1898b7a5bfed2b9614819e4f7";

const wallet = "0x564286362092d8e7936f0549571a803b203aaced";

class Contract {

    constructor(web3, name, address, abi_url) {
        this.web3 = web3;
        this.name = name;
        this.contract = {};
        this.instance = {};
        if (typeof address !== 'undefined') {
            this.address = address;
        }
        if (typeof abi_url !== "undefined") {
            this.abi_url = abi_url;
        }
    }

    prepare_contract() {
        let _this = this;
        return new Promise(function (resolve, reject) {
            if (typeof _this.address === "undefined" || typeof _this.abi_url === "undefined") {
                console.log("Invalid address or abi file path");
                return;
            }
            $.getJSON(_this.abi_url, function (data) {
                _this.contract = _this.web3.eth.contract(data);
                _this.instance = _this.contract.at(_this.address);
                console.log(_this.name + " contract @ " + _this.address + " has been loaded");
            }).done(function () {
                resolve();
            }).fail(function () {
                reject();
            })
        });

    }
}

window.onload = function () {

    let browserChrome = !!window.chrome && !!window.chrome.webstore;
    let browserFirefox = typeof InstallTrigger !== 'undefined';

    if (!browserChrome && !browserFirefox) {
        // window.location.href = "./notice/notice_supported/index.html";
    } else if (typeof web3 === 'undefined') {
        // window.location.href = "./notice/notice_install/index.html";
        console.log('No web3? You should consider trying MetaMask!')
    } else {
        window.web3 = new Web3(web3.currentProvider);

        if (web3.eth.defaultAccount === undefined) {
            // window.location.href = "./notice/notice_locked/index.html"
            alert("@dev TO BE REMOVED : DOES NOT need to log in, If logged in, show default account in field");
        } else start_app();
    }
};

function start_app(){
    //todo 1 : load web3.eth.defaultAccount to wallet address text field
    // $("#wallet").text(web3.eth.defaultAccount);
    window.crowdsale = new Contract(web3, "Nebula Crowdsale", crowdsale_address, crowdsale_abi);
    window.token = new Contract(web3, "Nebula Token", token_address, token_abi);

    window.crowdsale.prepare_contract()
        .then(()=>{
            return window.token.prepare_contract();
        })
        .then(()=>{
            return get_time_locked_contract_size();
        })
        .then(console.log)
        .catch(console.log);



//   ready for app

    //example :
}

//sample implementation of abi call to promise function
function get_time_locked_contract_size(){
    return new Promise((resolve, reject)=>{
        //todo implement
        // let wallet = $("#wallet").val();
        window.token.instance.get_time_locked_contract_size(wallet, (error, result)=>{
            if(error) reject();
            else resolve(Number(result));
        });
    })
}