import { murdockHttpBaseUrl } from './constants';

const Artifact = (props) => {
    return (
        <div className="row">
            <a href={`${murdockHttpBaseUrl}/results/${props.job_uid}/${props.artifact}`} target="_blank" rel="noreferrer noopener">{props.artifact}</a>
        </div>
    );
};

export const JobArtifacts = (props) => {
    return (
        <div className="card m-1">
            <div className="card-body">
                {props.job.artifacts.map(artifact => <Artifact key={artifact} artifact={artifact} job_uid={props.job.uid} />)}
            </div>
        </div>
    );
};
