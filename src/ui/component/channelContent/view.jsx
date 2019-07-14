// @flow
import React, { Fragment, useEffect, useState, useRef } from 'react';
import ClaimList from 'component/claimList';
import HiddenNsfwClaims from 'component/hiddenNsfwClaims';
import { withRouter } from 'react-router-dom';
import Paginate from 'component/common/paginate';
import Spinner from 'component/spinner';
import { FormField } from 'component/common/form';
import moment from 'moment';
import usePersistedState from 'util/use-persisted-state';
import ClaimPreview from 'component/claimPreview';
import { parseURI } from 'lbry-redux';


const TYPE_TRENDING = 'trending';
const TYPE_TOP = 'top';
const TYPE_NEW = 'new';
const TIME_DAY = 'day';
const TIME_WEEK = 'week';
const TIME_MONTH = 'month';
const TIME_YEAR = 'year';
const TIME_ALL = 'all';
const SEARCH_TYPES = [TYPE_TRENDING, TYPE_TOP, TYPE_NEW];
const SEARCH_TIMES = [TIME_DAY, TIME_WEEK, TIME_MONTH, TIME_YEAR, TIME_ALL];
const PAGE_SIZE = 20;

type Props = {
  uri: string,
  uris: Array<string>,
  loading: boolean,
  channelIsMine: boolean,
  doClaimSearch: (number, {}) => void,
};

function ChannelContent(props: Props) {
  const { uri, loading, channelIsMine, doClaimSearch, uris } = props;

  const [typeSort, setTypeSort] = usePersistedState('channelContent:typeSort', TYPE_NEW);
  const [timeSort, setTimeSort] = usePersistedState('channelContent:timeSort', TIME_WEEK);
  const toCapitalCase = string => string.charAt(0).toUpperCase() + string.slice(1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const { claimId } = parseURI(uri);
    const options: {
      page_size: number,
      order_by: Array<string>,
      release_time: string,
      channel_ids: Array<string>,
      no_totals: boolean,
    } = {page_size: PAGE_SIZE, channel_ids: [claimId], page, no_totals: true  };

    if (typeSort === TYPE_TRENDING) {
      options.order_by = ['trending_global', 'trending_mixed'];
    } else if (typeSort === TYPE_NEW) {
      options.order_by = ['release_time'];
    } else if (typeSort === TYPE_TOP) {
      options.order_by = ['effective_amount'];
    }
      if (timeSort !== TIME_ALL) {
        const time = Math.floor(
          moment()
            .subtract(1, timeSort)
            .unix()
        );
        options.release_time = `>${time}`;
      }
      doClaimSearch(20, options);
  }, [ typeSort, timeSort, page, doClaimSearch]);

  function resetList() {
    setPage(1);
  }

  const header = (
  <h1 className="card__title--flex">
    <FormField
      className="claim-list__dropdown"
      type="select"
      name="trending_sort"
      value={typeSort}
      onChange={e => {
        resetList();
        setTypeSort(e.target.value);
      }}
    >
      {SEARCH_TYPES.map(type => (
        <option key={type} value={type}>
          {toCapitalCase(type)}
        </option>
      ))}
    </FormField>
    <FormField
      className="claim-list__dropdown"
      type="select"
      name="trending_time"
      value={timeSort}
      onChange={e => {
        resetList();
        setTimeSort(e.target.value);
      }}
    >
      {SEARCH_TIMES.map(time => (
        <option key={time} value={time}>
          {/* i18fixme */}
          {time === TIME_DAY && __('Today')}
          {time !== TIME_ALL && time !== TIME_DAY && `${__('This')} ${toCapitalCase(time)}`}
          {time === TIME_ALL && __('All time')}
        </option>
      ))}
    </FormField>
  </h1>
);
  return (
  <div className="card">
    <ClaimList
      loading={loading}
      uris={uris}
      header={header}
      onScrollBottom={() => setPage(page + 1)}
      page={page}
      pageSize={PAGE_SIZE}
    />

    {loading && page > 1 && new Array(PAGE_SIZE).fill(1).map((x, i) => <ClaimPreview key={i} placeholder />)}
  </div>
);
}

export default withRouter(ChannelContent);
