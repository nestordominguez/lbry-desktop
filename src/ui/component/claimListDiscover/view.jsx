// @flow
import type { Node } from 'react';
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { withRouter } from 'react-router';
import usePersistedState from 'util/use-persisted-state';
import { MATURE_TAGS } from 'lbry-redux';
import { FormField } from 'component/common/form';
import ClaimList from 'component/claimList';
import Tag from 'component/tag';
import ClaimPreview from 'component/claimPreview';
import { updateQueryParam } from 'util/query-params';

function getOptions() {}

const PAGE_SIZE = 20;
const TIME_DAY = 'day';
const TIME_WEEK = 'week';
const TIME_MONTH = 'month';
const TIME_YEAR = 'year';
const TIME_ALL = 'all';
const SEARCH_SORT_YOU = 'you';
const SEARCH_SORT_ALL = 'everyone';
const SEARCH_SORT_CHANNELS = 'channels';

const TYPE_TRENDING = 'new';
const TYPE_TOP = 'top';
const TYPE_NEW = 'trending';
const SEARCH_FILTER_TYPES = [SEARCH_SORT_YOU, SEARCH_SORT_CHANNELS, SEARCH_SORT_ALL];
const SEARCH_TYPES = [TYPE_TRENDING, TYPE_TOP, TYPE_NEW];
const SEARCH_TIMES = [TIME_DAY, TIME_WEEK, TIME_MONTH, TIME_YEAR, TIME_ALL];

type Props = {
  uris: Array<string>,
  subscribedChannels: Array<Subscription>,
  doClaimSearch: ({}) => void,
  injectedItem: any,
  tags: Array<string>,
  loading: boolean,
  personal: boolean,
  doToggleTagFollow: string => void,
  meta?: Node,
  showNsfw: boolean,
};

function ClaimListDiscover(props: Props) {
  const {
    doClaimSearch,
    claimSearchByQuery,
    tags,
    loading,
    personalView,
    injectedItem,
    meta,
    subscribedChannels,
    showNsfw,
    history,
    location,
  } = props;

  const { search, pathname } = location;
  const urlParams = new URLSearchParams(search);
  const personalSort = urlParams.get('sort') || SEARCH_SORT_YOU;
  const typeSort = urlParams.get('type') || TYPE_TRENDING;
  const timeSort = urlParams.get('time') || TIME_WEEK;
  const tagsInUrl = urlParams.get('t');

  const url = `${pathname}${search}`;
  const tagsToUseIGuess = tagsInUrl || tags;

  const page = Number(urlParams.get('page')) || 1;
  const count = PAGE_SIZE * page;

  const options: {
    page_size: number,
    any_tags?: Array<string>,
    order_by?: Array<string>,
    channel_ids?: Array<string>,
    release_time?: string,
    not_tags?: Array<string>,
  } = {
    page_size: PAGE_SIZE,
    page,
    // no_totals makes it so the sdk doesn't have to calculate total number pages for pagination
    // it's faster, but we will need to remove it if we start using total_pages
    no_totals: true,
  };

  if ((tags && !personalView) || (tags && personalView && personalSort === SEARCH_SORT_YOU)) {
    options.any_tags = tags;
  } else if (personalSort === SEARCH_SORT_CHANNELS) {
    options.channel_ids = subscribedChannels.map(channel => channel.uri.split('#')[1]);
  }

  if (!showNsfw) {
    options.not_tags = MATURE_TAGS;
  }

  if (typeSort === TYPE_TRENDING) {
    options.order_by = ['trending_global', 'trending_mixed'];
  } else if (typeSort === TYPE_NEW) {
    options.order_by = ['release_time'];
  } else if (typeSort === TYPE_TOP) {
    options.order_by = ['effective_amount'];
    if (timeSort !== TIME_ALL) {
      const time = Math.floor(
        moment()
          .subtract(1, timeSort)
          .unix()
      );
      options.release_time = `>${time}`;
    }
  }

  options.page_size = PAGE_SIZE;
  const optionsString = JSON.stringify(options);
  const { page: optionToIgnoreForQuery, release_time, ...rest } = options;
  const query = JSON.stringify(rest) + timeSort;

  const uris = claimSearchByQuery[query];

  const hasUris = !!uris;
  const uCount = uris && uris.length;
  const emptyResult = uris === null;
  const didNavigateForward = history.action === 'PUSH';

  const doSearch = !hasUris || didNavigateForward || (!loading && uCount < PAGE_SIZE * page);
  useEffect(() => {
    if (doSearch) {
      const searchOptions = JSON.parse(optionsString);
      doClaimSearch(searchOptions, timeSort);
    }
  }, [doClaimSearch, optionsString, timeSort]);

  function toCapitalCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  function getLabel(type) {
    if (type === SEARCH_SORT_ALL) {
      return __('Everyone');
    }

    return type === SEARCH_SORT_YOU ? __('Tags You Follow') : __('Channels You Follow');
  }

  function getSearch() {
    let search = `?`;
    if (!personalView) {
      search += `t=${tagsInUrl}&`;
    }

    return search;
  }

  function handleTypeSort(newTypeSort) {
    let url = `${getSearch()}type=${newTypeSort}&sort=${personalSort}`;
    if (newTypeSort === TYPE_TOP) {
      url += `&time=${timeSort}`;
    }
    history.push(url);
  }

  function handlePersonalSort(newPersonalSort) {
    history.push(`${getSearch()}type=${typeSort}&sort=${newPersonalSort}`);
  }

  function handleTimeSort(newTimeSort) {
    history.push(`${getSearch()}type=${typeSort}&sort=${personalSort}&time=${newTimeSort}`);
  }

  function handleScrollBottom() {
    if (!loading) {
      const uri = updateQueryParam(url, 'page', page + 1);
      history.replace(uri);
    }
  }

  const header = (
    <h1 className="card__title--flex">
      <FormField
        className="claim-list__dropdown"
        type="select"
        name="trending_sort"
        value={typeSort}
        onChange={e => handleTypeSort(e.target.value)}
      >
        {SEARCH_TYPES.map(type => (
          <option key={type} value={type}>
            {toCapitalCase(type)}
          </option>
        ))}
      </FormField>
      <span>{__('For')}</span>
      {!personalView && tags && tags.length ? (
        tags.map(tag => <Tag key={tag} name={tag} disabled />)
      ) : (
        <FormField
          type="select"
          name="trending_overview"
          className="claim-list__dropdown"
          value={personalSort}
          onChange={e => {
            handlePersonalSort(e.target.value);
          }}
        >
          {SEARCH_FILTER_TYPES.map(type => (
            <option key={type} value={type}>
              {getLabel(type)}
            </option>
          ))}
        </FormField>
      )}
      {typeSort === 'top' && (
        <FormField
          className="claim-list__dropdown"
          type="select"
          name="trending_time"
          value={timeSort}
          onChange={e => handleTimeSort(e.target.value)}
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
      )}
    </h1>
  );

  return (
    <div className="card">
      <ClaimList
        loading={loading}
        uris={uris}
        injectedItem={personalSort === SEARCH_SORT_YOU && injectedItem}
        header={header}
        headerAltControls={meta}
        onScrollBottom={handleScrollBottom}
        page={page}
        pageSize={PAGE_SIZE}
      />

      {loading && new Array(PAGE_SIZE).fill(1).map((x, i) => <ClaimPreview key={i} placeholder />)}
    </div>
  );
}

export default withRouter(ClaimListDiscover);
