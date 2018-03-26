const crowdsale_abi = "./abi/NebulaCrowdsale.json";
const token_abi = "./abi/NebulaToken.json";
const time_locked_abi = "./abi/Timelock.json";
const vesting_abi = "./abi/Vesting.json";

const crowdsale_address = "0xbe0066cce26fa2c2bab8756e6d359425c38e741a";
const token_address = "0xf427347bf90d1780b0b26359b42b7bc13448a286";

const sample_wallet_address = "0x82A446fEf169325F490c09788400b55fA0948082";

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

        // if (web3.eth.defaultAccount === undefined) {
        //     // window.location.href = "./notice/notice_locked/index.html"
        //     alert("@dev TO BE REMOVED : DOES NOT need to log in, If logged in, show default account in field");
        // } else
        start_app();
    }
};

function start_app(){
    //todo 1 : load web3.eth.defaultAccount to wallet address text field
    // $("#wallet").text(web3.eth.defaultAccount);
    window.crowdsale_instance = new Contract(web3, "Nebula Crowdsale", crowdsale_address, crowdsale_abi);
    window.token_instance = new Contract(web3, "Nebula Token", token_address, token_abi);

    window.crowdsale_instance.prepare_contract()
        .then(()=>{
            return window.token_instance.prepare_contract();
        })
        .then(()=>{
            return get_time_locked_contract_size(sample_wallet_address);
        })
        .then(result => {
            console.log("number of time locked contract " + Number(result));
            return get_all_time_locked_contract(sample_wallet_address);
        })
        .then(result => {
            console.log(result);
            return load_time_locked_contract(result[0]);
        })
        .then(instance => {
            let _instance = instance;
            console.log("Time locked contract at address "+instance.address+" has been loaded");
            return time_locked_beneficiary(_instance)
                .then(result => {
                    console.log("Beneficiary is "+result);
                    return time_locked_unlock_time(_instance);
                })
                .then(result => {
                    console.log("Unlock time " + new Date(result * 1000));
                    return time_locked_token_address(_instance);
                })
                .then(result=>{
                    console.log("Token Address "+result);
                    return release_one(_instance);
                })
                .then(result=>{
                    console.log("Releasing the first contract");
                    console.log(result);
                    return wei_raised();
                })
                .catch(msg=>{
                    console.log(msg);
                    return wei_raised();
                });
        })
        .then(result =>{
            console.log("wei raised : "+Number(result));
            return cap();
        })
        .then(result => {
            console.log("Fund Raise Cap: "+Number(result));
            return cap_reached();
        })
        .then(result => {
            console.log("Fund Raise Cap Reached " + result);
            return opening_time();
        })
        .then(result => {
            console.log("Opening Time : "+new Date(result*1000));
            return has_started();
        })
        .then(result => {
            console.log("Started : " + result);
            return closing_time();
        })
        .then(result => {
            console.log("Closing Time : "+new Date(result*1000));
            return has_closed();
        })
        .then(result => {
            console.log("Closed : "+result);
            return rate();
        })
        .then(result => {
            console.log("Exchange Rate : "+result);
            return token();
        })
        .then(result=>{
            console.log("Token Contract : "+result);
            return whitelist(sample_wallet_address);
        })
        .then(result => {
            console.log("Default Account has been added to whitelisted : "+result);
            return balance_of(sample_wallet_address);
        })
        .then(result => {
            console.log("Default Account has "+web3.fromWei(result,"ether")+" NBAI");
            return token_unlock_time();
        })
        .then(result => {
            console.log("Token Unlock time : "+new Date(result*1000));
            return total_supply();
        })
        .then(result => {
            console.log("Total Minted Token : "+Number(result)+" NBAI");
        })
        // .then() ready for app
        .catch(console.log);

}

/**
 *
 * @returns {Promise<txHash>} todo to be confirmed
 */
function buy_token(){
    return new Promise((resolve,reject)=>{
        // let beneficiary = $("#beneficiary").val();//todo
        // let amount = $("#purchase_amount").val();//todo
        // let type = $("#purchase_type").val(); //ether or wei "string" //todo a drop down list of "ether" and "wei"
        // if(type==="ether") amount = web3.toWei(amount,"ether");
        let beneficiary = web3.eth.defaultAccount;
        let amount = web3.toWei(2,"ether");
        window.crowdsale_instance.instance.buyTokens(beneficiary,{value:amount},(error, result)=>{
            if(error) reject();
            else resolve(result);
        })
    })
}

/**
 *
 * @returns {Promise<web3.BigNumber>}
 */
function cap(){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.cap((error, result)=>{
            if(error) reject();
            else resolve(result);
        })
    })
}

/**
 *
 * @returns {Promise<Boolean>}
 */
function cap_reached(){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.capReached((error, result)=>{
            if(error) reject(error);
            else resolve(result);
        });
    })
}

/**
 *
 * @returns {Promise<Number>} timestamp in seconds
 */
function closing_time(){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.closingTime((error, result)=>{
            if(error) reject(error);
            else resolve(result);
        })
    })
}

/**
 * Get all contract addresses
 * @returns {Promise<any>}
 */
function get_all_time_locked_contract(owner=web3.eth.defaultAccount){//todo use textfield value
    return new Promise((resolve,reject)=>{
        let list = [];
        let size = 0;
        let curr = 0;

        get_time_locked_contract_size(owner)
            .then(result => {
                size = Number(result);
                get_all_helper(owner, curr, size, list).then(resolve).catch(reject);
            });
    })
}

/**
 * Helper function
 * @param owner, inquiring address
 * @param curr, current index of contract array
 * @param size, size of contract array
 * @param list, output array
 * @returns {Promise<any>}
 */
function get_all_helper(owner, curr, size, list){
    return new Promise((resolve,reject)=>{
        time_locked_reclaim_addresses(owner, curr)
            .then(address =>{
                list.push(address);
                if(curr===size-1){
                    resolve(list);
                }else{
                    ++curr;
                    get_all_helper(owner, curr, size, list).then(resolve).catch(reject);
                }
            }).catch(reject);
    });
}

/**
 *
 * @returns {Promise<Boolean>}
 */
function has_closed(){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.hasClosed((error, result)=>{
            if(error) reject(error);
            else resolve(result);
        });
    })
}

/**
 *
 * @returns {Promise<Boolean>}
 */
function has_started(){
    return new Promise((resolve, reject)=>{
        window.crowdsale_instance.instance.hasStarted((error, result)=>{
            if(error) reject(error);
            else resolve(result);
        });
    })
}

/**
 *
 * @returns {Promise<Number>}
 */
function opening_time(){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.openingTime((error, result)=>{
            if(error) reject(error);
            else resolve(result);
        });
    });
}

/**
 *
 * @returns {Promise<web3.BigNumber>}
 */
function rate(){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.rate((error, result)=>{
            if(error) reject(error);
            else resolve(result);
        });
    });
}

/**
 *
 * @returns {Promise<address>}
 */
function token(){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.token((error, result)=>{
            if(error) reject(error);
            else resolve(result);
        });
    });
}
/**
 *
 * @returns {Promise<web3.BigNumber>}
 */
function wei_raised(){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.weiRaised((error, result)=>{
            if(error) reject();
            else resolve(result);
        });
    })
}
function whitelist(owner=web3.eth.defaultAccount){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.whitelist(owner,(error, result)=>{
            if(error) reject();
            else resolve(result);
        });
    })
}


//TOKEN contract ----------------------------------
//sample implementation of abi call to promise function
/**
 *
 * @returns {Promise<web3.BigNumber>}
 */
function get_time_locked_contract_size(owner= web3.eth.defaultAccount){// let wallet = $("#wallet").val(); //todo a textfield
    return new Promise((resolve, reject)=>{
        window.token_instance.instance.get_time_locked_contract_size(owner, (error, result)=>{
            if(error) reject();
            else resolve(result);
        });
    })
}
/**
 * @param owner, inquiring address
 * @param index index of the time locked contract array
 * @returns {Promise<address>}
 */
function time_locked_reclaim_addresses(owner=web3.eth.defaultAccount, index){//todo a textfield
    return new Promise((resolve,reject)=>{
        window.token_instance.instance.time_locked_reclaim_addresses(owner,index, (error, result)=>{
            if(error) reject(error);
            else resolve(result);
        });
    })
}

/**
 * One can release any account's fund to the registered beneficiary
 * @returns {Promise<txHash>} todo i think
 */
//todo add a check for callable iff all contracts are callable
function release_all(owner=web3.eth.defaultAccount){
    return new Promise((resolve, reject)=>{
        window.token_instance.instance.release_all(owner,(error, result)=>{
            if(error) reject();
            else resolve(result);
        });
    });
}

/**
 * Get the token balance of an address
 * @param owner
 * @returns {Promise<web3.BigNumber>}
 */
function balance_of(owner=web3.eth.defaultAccount){
    return new Promise((resolve, reject)=>{
        window.token_instance.instance.balanceOf(owner,(error, result)=>{
            if(error) reject();
            else resolve(result);
        });
    });
}

/**
 *
 * @returns {Promise<Number>}
 */
function token_unlock_time(){
    return new Promise((resolve, reject)=>{
        window.token_instance.instance.token_unlock_time((error, result)=>{
            if(error) reject();
            else resolve(result);
        });
    });
}

function total_supply(){
    return new Promise((resolve, reject)=>{
        window.token_instance.instance.totalSupply((error, result)=>{
            if(error) reject();
            else resolve(result);
        });
    });
}

//Time locked account--------------------------------------------------------
function load_time_locked_contract(address){
    return new Promise((resolve,reject)=>{
        let time_locked_contract = new Contract(web3, "Time Locked NBAI Contract", address, time_locked_abi);
        time_locked_contract.prepare_contract()
            .then(()=>{
                resolve(time_locked_contract);
            })
            .catch(reject);
    })
}
/**
 * Release the selected time locked contract at address
 * @param timelocked, contract to release token from
 * @returns {Promise<any>}
 */
function release_one(timelocked){
    return new Promise((resolve,reject)=>{
        balance_of(timelocked.address)
            .then(balance => {
                if(Number(balance)>0){
                    timelocked.instance.release((error,result)=>{
                        if(error) reject(error);
                        else resolve(result);
                    });
                }else{
                    //todo temp
                    let msg = "The time lock contract at "+timelocked.address+" does not hold any NBAI token";
                    alert(msg);
                    reject(msg);
                }
            })
    })
}

function time_locked_beneficiary(timelocked){
    return new Promise((resolve, reject)=>{
        timelocked.instance.beneficiary((error,result)=>{
            if(error) reject(error);
            else resolve(result);
        });
    });
}
function time_locked_unlock_time(timelocked){
    return new Promise((resolve,reject)=>{
        timelocked.instance.releaseTime((error,result)=>{
            if(error) reject(error);
            else resolve(result);
        })
    })
}
function time_locked_token_address(timelocked){
    return new Promise((resolve,reject)=>{
        timelocked.instance.token((error,result)=>{
            if(error) reject(error);
            else resolve(result);
        })
    })
}