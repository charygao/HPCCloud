import * as Actions from '../actions/clusters';
import deepClone    from 'mout/src/lang/deepClone';
import set          from 'mout/src/object/set';
import style        from 'HPCCloudStyle/PageWithMenu.mcss';

const initialState = {
  list: [],
  active: 0,
  pending: false,
  mapById: {},
};

const clusterTemplate = {
  name: 'new cluster',
  type: 'trad',
  classPrefix: style.statusCreatingIcon,
  log: [],
  config: {
    host: 'localhost',
    ssh: {
      user: 'Your_Login',
    },
    scheduler: {
      type: 'sge',
    },
    parallelEnvironment: '',
    numberOfSlots: 1,
    jobOutputDir: '/tmp',
    paraview: {
      installDir: '/opt/paraview',
    },
    hydra: {
      executablePath: '/some/path/fake',
    },
  },
};

function applyPreset(obj, preset = null) {
  if (preset) {
    Object.keys(preset).forEach(key => {
      set(obj, key, preset[key]);
    });
  }

  return obj;
}

const STATUS_TO_ICON = {
  undefined: style.statusNeedSave,
  error: style.statusErrorIcon,
  creating: style.statusCreatingIcon,
  created: style.statusCreatedIcon,
  launching: style.statusLaunchingIcon,
  running: style.statusRunningIcon,
  terminated: style.statusTerminatedIcon,
};

const tradFilter = (el) => el.type === 'trad';

function updateIcon(clusters) {
  clusters.forEach(cluster => {
    // Debug
    if (!STATUS_TO_ICON[cluster.status]) {
      console.log('missing icon for:', cluster.status);
    }

    cluster.classPrefix = STATUS_TO_ICON[cluster.status];
  });
}

export default function clustersReducer(state = initialState, action) {
  switch (action.type) {
    case Actions.ADD_CLUSTER: {
      return Object.assign(
        {}, state,
        {
          list: [].concat(state.list, deepClone(clusterTemplate)),
          active: state.list.filter(tradFilter).length,
        });
    }

    case Actions.ADD_EXISTING_CLUSTER: {
      const newCluster = action.cluster;
      const mapById = Object.assign({}, state.mapById);
      mapById[newCluster._id] = newCluster;
      return Object.assign({}, state, { mapById });
    }

    case Actions.REMOVE_CLUSTER: {
      const list = state.list.filter((item, idx) => idx !== action.index);
      const cluster = state.list.filter((item, idx) => idx === action.index)[0];
      const active = (state.active < list.length) ? state.active : (list.length - 1);
      const newState = Object.assign({}, state, { list, active });

      if (cluster && cluster._id && state.mapById[cluster._id]) {
        const mapById = Object.assign({}, state.mapById);
        delete mapById[cluster._id];
        return Object.assign(newState, { mapById });
      }
      return newState;
    }

    case Actions.REMOVE_CLUSTER_BY_ID: {
      const id = action.id;
      const list = state.list.filter((item) => item.id !== id);
      const active = (state.active < list.length) ? state.active : (list.length - 1);
      const mapById = Object.assign({}, state.mapById);
      delete mapById[id];
      return Object.assign({}, state, { mapById, list, active });
    }

    case Actions.UPDATE_ACTIVE_CLUSTER: {
      return Object.assign(
        {},
        state,
        { active: action.index });
    }

    case Actions.UPDATE_EXISTING_CLUSTER: {
      const mapById = Object.assign({}, state.mapById);
      mapById[action.cluster._id] = action.cluster;
      return Object.assign({}, state, { mapById });
    }

    case Actions.UPDATE_CLUSTERS: {
      // do not save ec2 clusters in the list, it's only used for trad clusters
      const list = action.clusters.filter((cluster) => cluster.type === 'trad');
      const active = (state.active < list.length) ? state.active : (list.length - 1);
      const mapById = Object.assign({}, state.mapById);
      updateIcon(list);
      action.clusters.forEach(cluster => {
        if (cluster._id) {
          mapById[cluster._id] = cluster;
        }
      });
      return Object.assign({}, state, { list, active, mapById });
    }

    case Actions.UPDATE_CLUSTER_PRESETS: {
      return Object.assign({}, state, { presets: action.presets });
    }

    case Actions.SAVE_CLUSTER: {
      const { index, cluster } = action;
      updateIcon([cluster]);

      const list = [].concat(
        state.list.slice(0, index),
        cluster,
        state.list.slice(index + 1));
      const active = (state.active < list.length) ? state.active : (list.length - 1);

      if (cluster._id) {
        const mapById = Object.assign({}, state.mapById, { [cluster._id]: cluster });
        return Object.assign({}, state, { list, active, mapById });
      }

      return Object.assign({}, state, { list, active });
    }

    case Actions.UPDATE_CLUSTER_STATUS: {
      const mapById = Object.assign({}, state.mapById);
      const cluster = Object.assign({}, state.mapById[action.id]);
      cluster.status = action.status;
      mapById[action.id] = cluster;
      return Object.assign({}, state, { mapById });
    }

    case Actions.CLUSTER_APPLY_PRESET: {
      const { index, name } = action;
      const cluster = applyPreset(Object.assign({}, state.list[index]), state.presets[name]);
      const list = [].concat(
        state.list.slice(0, index),
        cluster,
        state.list.slice(index + 1));
      const active = (state.active < list.length) ? state.active : (list.length - 1);

      if (cluster._id) {
        const mapById = Object.assign({}, state.mapById, { [cluster._id]: cluster });
        return Object.assign({}, state, { list, active, mapById });
      }

      return Object.assign({}, state, { list, active });
    }

    case Actions.TEST_CLUSTER: {
      return state;
    }

    case Actions.PENDING_CLUSTER_NETWORK: {
      return Object.assign({}, state, { pending: action.pending });
    }

    case Actions.TESTING_CLUSTER: {
      const index = action.index;
      const cluster = Object.assign({}, state.list[index], { classPrefix: style.statusTestingIcon });
      const list = [].concat(
        state.list.slice(0, index),
        cluster,
        state.list.slice(index + 1));

      return Object.assign({}, state, { list });
    }

    case Actions.UPDATE_CLUSTER_LOG: {
      const mapById = Object.assign({}, state.mapById);
      const cluster = Object.assign({}, state.mapById[action.id]);
      cluster.log = [].concat(cluster.log ? cluster.log : [], action.log);
      mapById[action.id] = cluster;
      return Object.assign({}, state, { mapById });
    }

    case Actions.SUB_CLUSTER_LOG: {
      const mapById = Object.assign({}, state.mapById);
      const cluster = Object.assign({}, mapById[action.id]);
      cluster.logStream = action.eventSource;
      mapById[action.id] = cluster;
      return Object.assign({}, state, { mapById });
    }

    case Actions.UNSUB_CLUSTER_LOG: {
      const mapById = Object.assign({}, state.mapById);
      if (mapById[action.id].logStream) {
        mapById[action.id].logStream.close();
        delete mapById[action.id].logStream;
        return Object.assign({}, state, { mapById });
      }

      return state;
    }

    default:
      return state;
  }
}
