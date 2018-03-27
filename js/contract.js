const crowdsale_abi = "./abi/NebulaCrowdsale.json";
const token_abi = "./abi/NebulaToken.json";
const time_locked_abi = "./abi/Timelock.json";
const vesting_abi = "./abi/Vesting.json";

const crowdsale_address = "0xefd5a35262d2e37b99bae27c694a16a85f8917ed";
const token_address = "0x43c3a092cba82b47616fee8f0209c208f1a2455e";

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

        if (web3.eth.defaultAccount === undefined) {
            // window.location.href = "./notice/notice_locked/index.html"
            alert("log in to metamask, If logged in, show default account in field");
            $("#my_wallet").val(sample_wallet_address);
        } else {
            $("#my_wallet").val(web3.eth.defaultAccount);
            start_app();
        }
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
        .then(() => {
            console.log("Contracts ready");
            return load_info();
        })
        .then(()=>{
            console.log("Crowdsale related");
            return whitelist($("#my_wallet").val());
        })
        .then(result => {
            $("#whitelisted").html(result?"yes":"no");
            return get_time_locked_contract_size($("#my_wallet").val());
        })
        .then(result => {
            result = Number(result);
            $("#lockedContract").html(result);
            check_purchase_history();
        })
        .catch(console.log);
}

/**
 * Time locked contract inquirer
 * Can get any address, not needed to login!!
 *
 * @returns {Promise<any>}
 */
function check_purchase_history(){
    return new Promise((resolve,reject)=>{
        $("#contract_list").empty();
        return get_all_time_locked_contract($("#my_wallet").val())
            .then(list=>{
                return display_timelocked(list,0,"contract_list")
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

/**
 * Helper function, should not need to call
 * @param list
 * @param index
 * @param appendTo
 * @returns {Promise<any>}
 */
function display_timelocked(list, index, appendTo){
    return new Promise((resolve, reject) => {
        let locked_contract = list[index];
        let amount;
        let _instance;
        let beneficiary;
        let unlock;
        let unlockable = false;

        balance_of(locked_contract)
            .then(balance => {
                amount = Number(web3.fromWei(balance, "ether"));
                return load_time_locked_contract(locked_contract);
            })
            .then(instance => {
                _instance = instance;
                return time_locked_beneficiary(_instance);
            })
            .then(result => {
                beneficiary = beneficiary === $("#my_wallet") ?  "Myself" : result;
                return time_locked_unlock_time(_instance);
            })
            .then(time => {
                unlock = new Date(Number(time) * 1000);
                let now = new Date().getTime();
                unlockable = now > unlock;
                let id = "release"+index;
                //todo example only
                let element = "#"+appendTo;
                let content = "<tr><td>" + (index+1) + "</td>" +
                    "<td>" + locked_contract + "</td>" +
                    "<td>" + beneficiary + "</td>" +
                    "<td>" + amount + "</td>" +
                    "<td>" + unlock + "</td>" +
                "<td><button id='"+id+"'>Release</button></td></tr>";

                $(element).append(content);
                if(!unlockable) $("#"+id).prop("disabled", true);
                $("#"+id).click(()=>{
                    if(unlockable) release_one(_instance);
                    else alert("Unlockable on "+unlock);
                });

                if(list.length-1 === index) {
                    $(element).append("<button id='release_all'>Release All</button>");
                    if(!unlockable) $("#release_all").prop("disabled", true);
                    $("#release_all").click(()=>{
                        if(unlockable) release_all(web3.eth.defaultAccount);
                        else alert("Unlockable at "+unlock);
                    });
                    resolve();
                }
                else display_timelocked(list, index+1, appendTo).then(resolve).catch(reject);
            })
            .catch(reject);
        });
}

/**
 * Aggregated basic crowdsale information loader, todo modify for deploy
 * @returns {Promise<any>}
 */
function load_info(){
    return new Promise((resolve,reject)=>{
        let cap_at = 0;
        let pvt_max = 0;
        let raised = 0;

        opening_time().then(result=> {
            $("#startAt").html(new Date(result * 1000));
        }).catch(reject);
        closing_time().then(result => $("#endAt").html(new Date(result*1000))).catch(reject);
        has_started().then(result=>{
            $("#started").html(result? "yes":"no")
        }).catch(reject);
        has_closed().then(result => {
            $("#ended").html(result? "yes":"no")
        });
        cap()
            .then(result => {
                cap_at = web3.fromWei(result, "ether");
                $("#capAt").html(cap_at + " Eth");
                //todo can get balance of private sale account and add it to here
                return wei_raised();
            })
            .then(result =>{
                raised = web3.fromWei(result,"ether");
                $("#raised").html(raised+" Eth");
                $("#raise_progress").html(Math.floor(raised/cap_at*100)+"%");
                return cap_reached();
            })
            .then(result => {
                $("#cap_reached").html(result?"yes":"no");
                return rate();
            })
            .then(result => {
                $("#rate").html(Number(result)+" NBAI/Eth");
                return token();
            })
            .then(result => {
                $("#token_address").html(result);
                return total_supply();
            })
            .then(result => {
                $("#total_supply").html(web3.fromWei(result,"ether")+" NBAI");
            })
            .catch(reject);
        resolve();
    });
}

/**
 * Purchase token function
 */
function purchase_token(){
    let amount = web3.toWei(Number($("#buyAmount").val()),"ether");
    let beneficiary = $("#my_wallet").val();
    //todo check valid input !!!!
    whitelist(beneficiary)
        .then(result=>{
            if(result){
                if (amount !== 0){
                    buy_token(amount, beneficiary)
                        .then(tx_detail=>{
                            console.log(tx_detail);
                            $("purchase_info").append(
                                "<tr><td>Mined at Block</td><td>"+Number(tx_detail.blockNumber)+"</td></tr>"
                            );

                            //todo Or just get the last one
                            $("#contract_list").empty();
                            return get_all_time_locked_contract($("#my_wallet").val());
                        })
                        .then(list => {
                            return display_timelocked(list,0,"contract_list");
                        })
                        .catch(console.log);
                }else{
                    //todo
                    alert("Enter purchase amount");
                }
            }else{
                //todo
                alert("Not yet whitelisted");
            }
        })
        .catch(error=>{
            //todo
            alert("Blockchain error");
            console.log(error);
        });
}

/**
 * Helper function for purchase_token(), should not need to be called directly
 * @returns {Promise<txHash>} todo to be confirmed
 */
function buy_token(amount, beneficiary=web3.eth.defaultAccount){
    return new Promise((resolve,reject)=>{
        window.crowdsale_instance.instance.buyTokens(beneficiary,{value:amount},(error, result)=>{
            if(error) reject();
            else {
                $("#purchase_info")
                    .empty()
                    .append("<td>Transaction Hash: </td><td>"+result+"</td>");
                check_transaction(result).then(resolve).catch(reject);
            }
        })
    })
}
function check_transaction(txHash){
    return new Promise((resolve,reject)=>{
        web3.eth.getTransaction(txHash, (error, result) => {
            if(error) reject(error);
            else {
                let tx = result;
                if (tx.blockNumber === null){
                    console.log("Mining");
                    setTimeout(()=>{
                        check_transaction(txHash).then(resolve).catch(reject)},
                        2500
                    );
                }else resolve(tx);
            }
        });
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
    debugger
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