import ButtonBar        from '../../../../../../panels/ButtonBar';
import FileListing      from '../../../../../../panels/FileListing';
import JobMonitor       from '../../../../../../panels/JobMonitor';
import merge            from 'mout/src/object/merge';
import React            from 'react';
import LoadingPanel     from '../../../../../../panels/LoadingPanel';
import { taskflowActions } from '../../../../../../utils/Constants';

import get              from '../../../../../../utils/get';
import { connect }      from 'react-redux';
import { dispatch }     from '../../../../../../redux';
import * as Actions     from '../../../../../../redux/actions/taskflows';
import * as SimActions  from '../../../../../../redux/actions/projects';
import * as ClusterActions  from '../../../../../../redux/actions/clusters';

function getActions(actionsList, disabled) {
  return actionsList.map((action) => Object.assign({ disabled }, taskflowActions[action]));
}

const visualizationView = React.createClass({
  displayName: 'pvw/view-visualization',

  propTypes: {
    location: React.PropTypes.object,
    project: React.PropTypes.object,
    simulation: React.PropTypes.object,
    step: React.PropTypes.string,
    taskFlowName: React.PropTypes.string,
    primaryJob: React.PropTypes.string,
    view: React.PropTypes.string,

    onTerminateTaskflow: React.PropTypes.func,
    onDeleteTaskflow: React.PropTypes.func,
    onVisualizeTaskflow: React.PropTypes.func,
    onTerminateInstance: React.PropTypes.func,

    taskflowId: React.PropTypes.string,
    taskflow: React.PropTypes.object,
    cluster: React.PropTypes.object,
    error: React.PropTypes.string,
  },

  contextTypes: {
    router: React.PropTypes.object,
  },

  onAction(action) {
    this[action]();
  },

  visualizeTaskflow() {
    const newSimState = Object.assign({}, this.props.simulation, { active: 'Visualization' });
    const location = {
      pathname: this.props.location.pathname,
      query: merge(this.props.location.query, { view: 'visualizer' }),
      state: this.props.location.state,
    };

    this.props.onVisualizeTaskflow(newSimState, location);
  },

  terminateInstance() {
    this.props.onTerminateInstance(this.props.taskflow.flow.meta.cluster._id);
  },

  terminateTaskflow() {
    this.props.onTerminateTaskflow(this.props.taskflowId);
  },

  deleteTaskflow() {
    const simulationStep = {
      id: this.props.simulation._id,
      step: 'Visualization',
      data: {
        view: 'default',
        metadata: {},
      },
    };
    const location = {
      pathname: this.props.location.pathname,
      query: { view: 'default' },
      state: this.props.location.state,
    };

    this.props.onDeleteTaskflow(this.props.taskflowId, simulationStep, location);
  },

  render() {
    if (!this.props.taskflow || !this.props.taskflow.flow) {
      return <LoadingPanel />;
    }

    const { taskflow, taskflowId, cluster, error, simulation } = this.props;
    const actions = [].concat(taskflow.actions);
    const tasks = taskflow.taskMapById ? Object.keys(taskflow.taskMapById).map(id => taskflow.taskMapById[id]) : [];
    const jobs = taskflow.jobMapById ? Object.keys(taskflow.jobMapById).map(id => taskflow.jobMapById[id]) : [];
    const fileActionsDisabled = cluster ? cluster.status !== 'running' : true;

    // Extract meaningful information from props
    if (jobs.length && jobs.some(job => job.name === this.props.primaryJob && job.status === 'running')) {
      actions.push('visualize');
    } else if (jobs.length && tasks.length &&
        jobs.every(job => job.status === 'complete') &&
        tasks.every(task => task.status === 'complete')) {
      actions.push('rerun');
    }

    return (
      <div>
        <JobMonitor taskflowId={ taskflowId }
          clusterId={taskflow.flow.meta ? taskflow.flow.meta.cluster._id : null}
        />
        <FileListing title="Input Files" folderId={simulation.metadata.inputFolder._id} actionsDisabled={fileActionsDisabled} />
        <FileListing title="Output Files" folderId={simulation.metadata.outputFolder._id} actionsDisabled={fileActionsDisabled} />
        <section>
            <ButtonBar
              onAction={ this.onAction }
              actions={ getActions(actions, false)}
              error={error}
            />
        </section>
      </div>);
  },
});

export default connect(
  (state, props) => {
    var taskflowId = null;
    const activeProject = state.projects.active;
    const activeSimulation = activeProject ? state.projects.simulations[activeProject].active : null;

    if (activeSimulation) {
      const simulation = state.simulations.mapById[activeSimulation];
      taskflowId = simulation.steps.Visualization.metadata.taskflowId;
    }

    let taskflow = null;
    if (taskflowId) {
      taskflow = state.taskflows.mapById[taskflowId];
    }

    let cluster = null;
    if (get(taskflow, 'flow.meta.cluster._id')) {
      const clusterId = taskflow.flow.meta.cluster._id;
      cluster = state.preferences.clusters.mapById[clusterId];
    }

    return {
      taskflowId, cluster, taskflow,
      error: null,
    };
  },
  () => ({
    onVisualizeTaskflow: (sim, location) => dispatch(SimActions.saveSimulation(sim, null, location)),
    onDeleteTaskflow: (id, simulationStep, location) => dispatch(Actions.deleteTaskflow(id, simulationStep, location)),
    onTerminateTaskflow: (id) => dispatch(Actions.terminateTaskflow(id)),
    onTerminateInstance: (id) => dispatch(ClusterActions.terminateCluster(id)),
  })
)(visualizationView);
