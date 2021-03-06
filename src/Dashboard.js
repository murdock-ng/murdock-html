/*
 * Copyright (C) 2021 Inria
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Author: Alexandre Abadie <alexandre.abadie@inria.fr>
 */

import { Component } from 'react';
import Websocket from 'react-websocket';
import axios from 'axios';

import { DashboardCard } from './DashboardCard';
import { LoadingSpinner, ShowMore } from './components';
import { itemsDisplayedStep, murdockHttpBaseUrl, murdockWsUrl, cardColor } from './constants';

class Dashboard extends Component {
    constructor(props) {
        super(props);
        this.queryParams = {
            jobsFinishedDisplayedLimit: itemsDisplayedStep,
            jobType: "pr",
            jobStates: ["queued", "running", "passed", "errored", "stopped"],
            prNumber: "",
            branch: "",
            tag: "",
            commitSha: "",
            commitAuthor: "",
        }
        this.state = {
            alerts: [],
            isFetched: false,
            jobsQueued: [],
            jobsRunning: [],
            jobsFinished: [],
            queryParams: this.queryParams,
        };
        this.fetchJobs = this.fetchJobs.bind(this);
        this.updateJobStates = this.updateJobStates.bind(this);
        this.handleWsData = this.handleWsData.bind(this);
        this.handleWsOpen = this.handleWsOpen.bind(this);
        this.handleWsClose = this.handleWsClose.bind(this);
        this.displayMore = this.displayMore.bind(this);
        this.notify = this.notify.bind(this);
        this.search = this.search.bind(this);
        this.isPRClicked = this.isPRClicked.bind(this);
        this.isBranchClicked = this.isBranchClicked.bind(this);
        this.isTagClicked = this.isTagClicked.bind(this);
        this.showQueuedClicked = this.showQueuedClicked.bind(this);
        this.showRunningClicked = this.showRunningClicked.bind(this);
        this.showPassedClicked = this.showPassedClicked.bind(this);
        this.showErroredClicked = this.showErroredClicked.bind(this);
        this.showStoppedClicked = this.showStoppedClicked.bind(this);
        this.prNumberChanged = this.prNumberChanged.bind(this);
        this.branchChanged = this.branchChanged.bind(this);
        this.tagChanged = this.tagChanged.bind(this);
        this.commitShaChanged = this.commitShaChanged.bind(this);
        this.commitAuthorChanged = this.commitAuthorChanged.bind(this);
        this.keyUp = this.keyUp.bind(this);
    }

    fetchJobs() {
        let queryString = `limit=${this.queryParams.jobsFinishedDisplayedLimit}&states=${this.queryParams.jobStates.join("+")}`;
        if (this.queryParams.jobType === "pr") {
            queryString = `${queryString}&is_pr=true`
        }
        if (this.queryParams.jobType === "branch") {
            queryString = `${queryString}&is_branch=true`
        }
        if (this.queryParams.jobType === "tag") {
            queryString = `${queryString}&is_tag=true`
        }
        if (this.queryParams.jobType === "pr" && this.queryParams.prNumber) {
            queryString = `${queryString}&prnum=${this.queryParams.prNumber}`
        }
        if (this.queryParams.jobType === "branch" && this.queryParams.branch) {
            queryString = `${queryString}&branch=${this.queryParams.branch}`
        }
        if (this.queryParams.jobType === "tag" && this.queryParams.tag) {
            queryString = `${queryString}&tag=${this.queryParams.tag}`
        }
        if (this.queryParams.commitSha) {
            queryString = `${queryString}&sha=${this.queryParams.commitSha}`
        }
        if (this.queryParams.commitAuthor) {
            queryString = `${queryString}&author=${this.queryParams.commitAuthor}`
        }
        axios.get(`${murdockHttpBaseUrl}/jobs?${queryString}`)
            .then(res => {
                const jobs = res.data;
                const queued = (jobs.queued) ? jobs.queued : [];
                const running = (jobs.running) ? jobs.running : [];
                const finished = (jobs.finished) ? jobs.finished : [];
                const newState = { 
                    isFetched : true,
                    jobsQueued: queued,
                    jobsRunning: running,
                    jobsFinished: finished,
                    queryParams: this.queryParams,
                };
                this.setState(newState);
            })
            .catch(error => {
                console.log(error);
                this.setState({ isFetched : true });
            });
    }

    handleWsData(data) {
        const msg = JSON.parse(data);
        if (msg.cmd === "reload") {
            this.fetchJobs();
        }
        else if (msg.cmd === "status" && this.state.isFetched) {
            if (this.state.jobsRunning.length) {
                let jobs = this.state.jobsRunning.slice();
                for (let idx = 0; idx < jobs.length; idx++) {
                    if (jobs[idx].uid === msg.uid) {
                        jobs[idx].status = msg.status;
                    }
                }
                this.setState({jobsRunning: jobs});
            }
        }
        else if (msg.cmd === "output" && this.state.isFetched) {
            if (this.state.jobsRunning.length) {
                let jobs = this.state.jobsRunning.slice();
                for (let idx = 0; idx < jobs.length; idx++) {
                    if (jobs[idx].uid === msg.uid) {
                        jobs[idx].output += msg.line;
                    }
                }
                this.setState({jobsRunning: jobs});
            }
        }
    }

    handleWsOpen() {
        console.log("Websocket opened");
    }

    handleWsClose() {
        console.log("Websocket closed");
    }

    displayMore() {
        this.queryParams.jobsFinishedDisplayedLimit = this.state.jobsFinished.length + itemsDisplayedStep;
        this.fetchJobs();
    }

    componentDidMount() {
        document.title = "Murdock - Dashboard";
        if (!this.state.isFetched) {
            this.fetchJobs();
        }
    }

    notify(uid, result, message) {
        const alertsList = this.state.alerts.slice();
        alertsList.push({uid: uid, result: result, message: message})
        this.setState({alerts: alertsList.reverse()});
        setTimeout(() => {
            const alertsList = this.state.alerts.filter(item => item.uid !== uid);
            this.setState({alerts: alertsList});
        }, 6000);
    }

    isPRClicked() {
        this.queryParams.jobType = "pr";
        this.search();
    }

    isBranchClicked() {
        this.queryParams.jobType = "branch";
        this.search();
    }

    isTagClicked() {
        this.queryParams.jobType = "tag";
        this.search();
    }

    updateJobStates(state) {
        if (this.queryParams.jobStates.includes(state)) {
            this.queryParams.jobStates = this.queryParams.jobStates.filter(elem => elem !== state);
        } else {
            this.queryParams.jobStates.push(state);
        }
    }

    showQueuedClicked() {
        this.updateJobStates("queued");
        this.search();
    }

    showRunningClicked() {
        this.updateJobStates("running");
        this.search();
    }

    showPassedClicked() {
        this.updateJobStates("passed");
        this.search();
    }

    showErroredClicked() {
        this.updateJobStates("errored");
        this.search();
    }

    showStoppedClicked() {
        this.updateJobStates("stopped");
        this.search();
    }

    prNumberChanged(event) {
        this.queryParams.prNumber = event.target.value;
        this.setState({queryParams: this.queryParams});
    }

    branchChanged(event) {
        this.queryParams.branch = event.target.value;
        this.setState({queryParams: this.queryParams});
    }

    tagChanged(event) {
        this.queryParams.tag = event.target.value;
        this.setState({queryParams: this.queryParams});
    }

    commitShaChanged(event) {
        this.queryParams.commitSha = event.target.value;
        this.setState({queryParams: this.queryParams});
    }

    commitAuthorChanged(event) {
        this.queryParams.commitAuthor = event.target.value;
        this.setState({queryParams: this.queryParams});
    }

    keyUp(event) {
        if (event.key === 'Enter') {
            this.search();
        }
    }

    search() {
        this.setState({isFetched: false});
        this.fetchJobs();
    }

    render() {
        return (
            <>
                <div className="position-fixed bottom-0 end-0 p-3" style={{zIndex:11}}>
                    {
                        this.state.alerts.map(item => (
                            <div key={item.uid} className="toast show m-1" role="alert" aria-live="assertive" aria-atomic="true">
                                <div className={`toast-body text-${item.result}`}>
                                    <i className={`bi-${(item.result === "danger") ? "x" : "info"}-circle-fill me-2`}></i>{item.message}
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div className="container">
                    {(this.state.isFetched) ? (
                        <>
                        <div className="btn-toolbar justify-content-center m-1" role="toolbar">
                            <div className="btn-group me-1" role="group">
                                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkPRs" onClick={this.isPRClicked} defaultChecked={this.queryParams.jobType === "pr"} />
                                <label className="btn btn-outline-primary" htmlFor="checkPRs">PRs</label>
                                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkBranches" onClick={this.isBranchClicked} defaultChecked={this.queryParams.jobType === "branch"} />
                                <label className="btn btn-outline-primary" htmlFor="checkBranches">Branches</label>
                                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkTags" onClick={this.isTagClicked} defaultChecked={this.queryParams.jobType === "tag"} />
                                <label className="btn btn-outline-primary" htmlFor="checkTags">Tags</label>
                            </div>
                            <div className="btn-group me-1" role="group">
                                <input type="checkbox" className="btn-check" id="checkQueued" onClick={this.showQueuedClicked} defaultChecked={this.queryParams.jobStates.includes("queued")} />
                                <label className={`btn btn-outline-${cardColor["queued"]}`} htmlFor="checkQueued" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${this.queryParams.jobStates.includes("queued") ? "Hide" : "Show"} queued jobs`}><i className="bi-inbox"></i></label>
                                <input type="checkbox" className="btn-check" id="checkRunning" onClick={this.showRunningClicked} defaultChecked={this.queryParams.jobStates.includes("running")} />
                                <label className={`btn btn-outline-${cardColor["running"]}`} htmlFor="checkRunning" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${this.queryParams.jobStates.includes("running") ? "Hide" : "Show"} running jobs`}><i className="bi-gear-fill"></i></label>
                                <input type="checkbox" className="btn-check" id="checkPassed" onClick={this.showPassedClicked} defaultChecked={this.queryParams.jobStates.includes("passed")} />
                                <label className={`btn btn-outline-${cardColor["passed"]}`} htmlFor="checkPassed" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${this.queryParams.jobStates.includes("passed") ? "Hide" : "Show"} passed jobs`}><i className="bi-check-circle-fill"></i></label>
                                <input type="checkbox" className="btn-check" id="checkErrored" onClick={this.showErroredClicked} defaultChecked={this.queryParams.jobStates.includes("errored")} />
                                <label className={`btn btn-outline-${cardColor["errored"]}`} htmlFor="checkErrored" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${this.queryParams.jobStates.includes("errored") ? "Hide" : "Show"} errored jobs`}><i className="bi-x-circle-fill"></i></label>
                                <input type="checkbox" className="btn-check" id="checkStopped" onClick={this.showStoppedClicked} defaultChecked={this.queryParams.jobStates.includes("stopped")} />
                                <label className={`btn btn-outline-${cardColor["stopped"]}`} htmlFor="checkStopped" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${this.queryParams.jobStates.includes("stopped") ? "Hide" : "Show"} stopped jobs`}><i className="bi-dash-circle-fill"></i></label>
                            </div>
                            {(this.queryParams.jobType === "pr") && <div className="input-group me-1" style={{maxWidth: "250px"}}>
                                <div className="input-group-text" id="inputSearchPR">PR #</div>
                                <input type="text" className="form-control" placeholder="PR number" aria-label="PR number" aria-describedby="inputSearchPR" value={this.queryParams.prNumber} onChange={this.prNumberChanged} onKeyUp={this.keyUp} />
                            </div>}
                            {(this.queryParams.jobType === "branch") && <div className="input-group me-1" style={{maxWidth: "250px"}}>
                                <div className="input-group-text" id="inputSearchBranch">Branch</div>
                                <input type="text" className="form-control" placeholder="Branch name" aria-label="Branch name" aria-describedby="inputSearchBranch" value={this.queryParams.branch} onChange={this.branchChanged} onKeyUp={this.keyUp} />
                            </div>}
                            {(this.queryParams.jobType === "tag") && <div className="input-group me-1" style={{maxWidth: "250px"}}>
                                <div className="input-group-text" id="inputSearchTag">Tag</div>
                                <input type="text" className="form-control" placeholder="Tag name" aria-label="Tag name" aria-describedby="inputSearchTag" value={this.queryParams.tag} onChange={this.tagChanged} onKeyUp={this.keyUp} />
                            </div>}
                            <div className="input-group me-1">
                                <div className="input-group-text" id="inputSearchCommit"><i className="bi-tag"></i></div>
                                <input type="text" className="form-control" placeholder="Commit SHA" aria-label="Commit SHA" aria-describedby="inputSearchCommit" value={this.queryParams.commitSha} onChange={this.commitShaChanged} onKeyUp={this.keyUp} />
                            </div>
                            <div className="input-group me-1">
                                <div className="input-group-text" id="inputSearchAuthor"><i className="bi-person"></i></div>
                                <input type="text" className="form-control" placeholder="Commit author" aria-label="Commit author" aria-describedby="inputSearchAuthor" value={this.queryParams.commitAuthor} onChange={this.commitAuthorChanged} onKeyUp={this.keyUp} />
                            </div>
                        </div>
                        {this.state.jobsQueued.map(job => <DashboardCard key={job.uid} job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
                        {this.state.jobsRunning.map(job => <DashboardCard key={job.uid} job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
                        {this.state.jobsFinished.map(job => <DashboardCard key={job.uid} job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
                        </>
                    ) : <LoadingSpinner />
                    }
                    {(this.state.isFetched && this.state.jobsFinished.length && this.state.jobsFinished.length === this.queryParams.jobsFinishedDisplayedLimit) ? <ShowMore onclick={this.displayMore} /> : null}
                </div>
                <Websocket
                    url={murdockWsUrl}
                    onOpen={this.handleWsOpen}
                    onMessage={this.handleWsData}
                    onClose={this.handleWsClose}
                />
            </>
        );
    }
}

export default Dashboard;
